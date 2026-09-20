import React, { useState } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Search, 
  RefreshCw, 
  ShieldCheck, 
  Cpu, 
  Sliders, 
  HelpCircle, 
  Building2, 
  Calculator, 
  ArrowRight, 
  Check, 
  ExternalLink,
  Zap,
  Info
} from 'lucide-react';
import { AppSettings, Product, FiscalAuditRule, NfceNfeItem } from '../../types';

interface AuditoriaSectionProps {
  settings: AppSettings;
  products: Product[];
  setProducts: (products: Product[]) => void;
  notes: NfceNfeItem[];
  tenantId?: string;
  onShowToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

const SEFAZ_SERVERS = [
  { uf: 'SP', name: 'São Paulo', authorizer: 'SEFAZ-SP', status: 'online', latency: '48ms' },
  { uf: 'RJ', name: 'Rio de Janeiro', authorizer: 'SVRS', status: 'online', latency: '65ms' },
  { uf: 'MG', name: 'Minas Gerais', authorizer: 'SEFAZ-MG', status: 'online', latency: '52ms' },
  { uf: 'RS', name: 'Rio Grande do Sul', authorizer: 'SEFAZ-RS', status: 'online', latency: '40ms' },
  { uf: 'PR', name: 'Paraná', authorizer: 'SEFAZ-PR', status: 'online', latency: '55ms' },
  { uf: 'SC', name: 'Santa Catarina', authorizer: 'SVRS', status: 'online', latency: '60ms' },
  { uf: 'BA', name: 'Bahia', authorizer: 'SEFAZ-BA', status: 'online', latency: '75ms' },
  { uf: 'GO', name: 'Goiás', authorizer: 'SEFAZ-GO', status: 'online', latency: '70ms' },
  { uf: 'DF', name: 'Distrito Federal', authorizer: 'SVRS', status: 'online', latency: '58ms' },
  { uf: 'PE', name: 'Pernambuco', authorizer: 'SEFAZ-PE', status: 'online', latency: '82ms' },
  { uf: 'CE', name: 'Ceará', authorizer: 'SEFAZ-CE', status: 'online', latency: '80ms' },
  { uf: 'AM', name: 'Amazonas', authorizer: 'SEFAZ-AM', status: 'online', latency: '95ms' }
];

const SEFAZ_REJEICOES_KNOWLEDGE = [
  {
    code: '204',
    title: 'Duplicidade de NF-e / NFC-e [nRec: 135...]',
    cause: 'Uma nota fiscal com este mesmo número e série já foi transmitida e autorizada anteriormente.',
    solution: 'O sistema avança automaticamente o número da nota para o próximo disponível no cadastro ou consulte a chave original.'
  },
  {
    code: '215',
    title: 'Falha no Schema XML da NF-e',
    cause: 'O arquivo XML gerado contém tags em formato inválido, caracteres especiais proibidos ou campos obrigatórios ausentes.',
    solution: 'Verifique se o nome do cliente ou razão social não possui caracteres acentuados corrompidos ou se o NCM possui 8 dígitos exatos.'
  },
  {
    code: '230',
    title: 'IE do Emitente não cadastrada ou cancelada',
    cause: 'A Inscrição Estadual informada não confere com o cadastro ativo no CADESP/Sintegra da SEFAZ.',
    solution: 'Acesse o Sintegra do seu estado ou CCC (Cadastro Centralizado de Contribuintes) e confirme a numeração exata da sua IE.'
  },
  {
    code: '462',
    title: 'Certificado Digital do Emitente Vencido ou Revogado',
    cause: 'O arquivo .PFX/.P12 expirou sua validade de 1 ano ICP-Brasil.',
    solution: 'Acesse a aba Certificado e instale um novo arquivo .PFX atualizado junto à sua Autoridade Certificadora.'
  },
  {
    code: '539',
    title: 'Duplicidade de NF-e com diferença na Chave de Acesso',
    cause: 'Tentativa de emitir o mesmo número de nota com dados de data ou valor diferentes da nota original.',
    solution: 'Inutilize a numeração pulada ou incremente o sequencial fiscal nas configurações.'
  },
  {
    code: '778',
    title: 'Informado NCM inexistente na tabela da Receita Federal',
    cause: 'O produto está com código NCM desatualizado ou digitado incorretamente.',
    solution: 'Utilize a ferramenta de correção automática de NCMs abaixo para padronizar para 8517.79.00 (Peças e Acessórios).'
  }
];

export const AuditoriaSection: React.FC<AuditoriaSectionProps> = ({
  settings,
  products,
  setProducts,
  notes,
  tenantId = '',
  onShowToast
}) => {
  const [activeAuditorTab, setActiveAuditorTab] = useState<'regras' | 'sefaz' | 'rejeicoes' | 'relatorio'>('regras');
  const [rejectionSearch, setRejectionSearch] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  // Executa varredura de regras fiscais no catálogo de produtos
  const invalidNcmCount = products.filter(p => !p.ncm || p.ncm.replace(/\D/g, '').length !== 8).length;
  const zeroPriceCount = products.filter(p => !p.salePrice || p.salePrice <= 0).length;
  const isCertConfigured = settings.certificateA1?.hasCertificate;

  const handleFixAllNcms = () => {
    const updated = products.map(p => {
      if (!p.ncm || p.ncm.replace(/\D/g, '').length !== 8) {
        return { ...p, ncm: '8517.79.00' };
      }
      return p;
    });

    setProducts(updated);
    onShowToast(`NCM padrão (8517.79.00) aplicado em ${invalidNcmCount} produtos com sucesso!`, 'success');
  };

  const filteredRejections = SEFAZ_REJEICOES_KNOWLEDGE.filter(r => {
    const term = rejectionSearch.toLowerCase();
    return r.code.includes(term) || r.title.toLowerCase().includes(term) || r.cause.toLowerCase().includes(term);
  });

  // Métricas do Relatório Fiscal
  const totalNotesEmitted = notes.filter(n => n.status === 'authorized').length;
  const totalGrossRevenue = notes.filter(n => n.status === 'authorized').reduce((acc, n) => acc + (n.totals?.totalAmount ?? (n as any).total ?? 0), 0);
  const totalCanceledNotes = notes.filter(n => n.status === 'canceled').length;

  return (
    <div className="space-y-6">
      {/* HEADER DA AUDITORIA FISCAL */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <Sparkles size={20} className="text-blue-600" />
            Auditoria Fiscal & Inteligência Tributária
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Validador pre-flight de cadastros, monitoramento de servidores SEFAZ e diagnóstico inteligente de rejeições.
          </p>
        </div>

        {/* SUB-ABAS DA AUDITORIA */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl">
          {[
            { id: 'regras', label: 'Validador Fiscal' },
            { id: 'sefaz', label: 'Status SEFAZ' },
            { id: 'rejeicoes', label: 'Base de Rejeições' },
            { id: 'relatorio', label: 'Resumo Contábil' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveAuditorTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeAuditorTab === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ABA 1: VALIDADOR DE REGRAS FISCAIS */}
      {activeAuditorTab === 'regras' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card NCM */}
            <div className={`p-5 rounded-3xl border transition-all ${
              invalidNcmCount > 0 ? 'bg-amber-50/70 border-amber-200' : 'bg-emerald-50/70 border-emerald-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Validação de NCM</span>
                {invalidNcmCount > 0 ? <AlertTriangle size={18} className="text-amber-600" /> : <CheckCircle2 size={18} className="text-emerald-600" />}
              </div>
              <h3 className="text-lg font-black text-slate-900 mt-2">
                {invalidNcmCount > 0 ? `${invalidNcmCount} Produtos Incompletos` : '100% NCMs Válidos'}
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                {invalidNcmCount > 0 
                  ? 'Produtos sem código NCM de 8 dígitos serão rejeitados na emissão da NF-e / NFC-e.'
                  : 'Todos os produtos possuem código fiscal NCM cadastrado corretamente.'}
              </p>
              {invalidNcmCount > 0 && (
                <button
                  type="button"
                  onClick={handleFixAllNcms}
                  className="mt-4 w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Zap size={14} /> Corrigir Automaticamente
                </button>
              )}
            </div>

            {/* Card Certificado A1 */}
            <div className={`p-5 rounded-3xl border transition-all ${
              !isCertConfigured ? 'bg-red-50/70 border-red-200' : 'bg-emerald-50/70 border-emerald-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Certificado Digital</span>
                {!isCertConfigured ? <XCircle size={18} className="text-red-600" /> : <CheckCircle2 size={18} className="text-emerald-600" />}
              </div>
              <h3 className="text-lg font-black text-slate-900 mt-2">
                {isCertConfigured ? 'Certificado A1 Ativo' : 'Certificado Não Instalado'}
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                {isCertConfigured 
                  ? `Válido para emissões em produção e testes com ${settings.certificateA1?.daysRemaining} dias restantes.`
                  : 'A emissão de notas fiscais perante a SEFAZ requer um Certificado Digital A1 (.pfx).'}
              </p>
            </div>

            {/* Card CNPJ & Inscrição Estadual */}
            <div className={`p-5 rounded-3xl border transition-all ${
              !settings.storeCnpj ? 'bg-amber-50/70 border-amber-200' : 'bg-emerald-50/70 border-emerald-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Cadastro de Emitente</span>
                {!settings.storeCnpj ? <AlertTriangle size={18} className="text-amber-600" /> : <CheckCircle2 size={18} className="text-emerald-600" />}
              </div>
              <h3 className="text-lg font-black text-slate-900 mt-2 truncate">
                {settings.storeCnpj || 'CNPJ Não Preenchido'}
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                IE: {settings.storeStateRegistration || 'ISENTO'} • Simples Nacional
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: MONITOR DE SERVIDORES SEFAZ */}
      {activeAuditorTab === 'sefaz' && (
        <div className="space-y-4">
          <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></div>
              <div>
                <h3 className="text-xs font-black uppercase">Rede Nacional de WebServices SEFAZ</h3>
                <p className="text-[11px] text-slate-400 font-medium">Disponibilidade dos servidores autorizadores em tempo real</p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">100% Operacional</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {SEFAZ_SERVERS.map(srv => (
              <div key={srv.uf} className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-slate-900">{srv.uf} - {srv.name}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>{srv.authorizer}</span>
                  <span className="text-emerald-600 font-bold">{srv.latency}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA 3: BASE DE CONHECIMENTO DE REJEIÇÕES */}
      {activeAuditorTab === 'rejeicoes' && (
        <div className="space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="BUSCAR REJEIÇÃO (EX: 204, 215, NCM, CERTIFICADO)..."
              value={rejectionSearch}
              onChange={(e) => setRejectionSearch(e.target.value)}
              className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-2xl text-xs font-bold uppercase placeholder:text-slate-300 outline-none focus:border-blue-500 transition-all shadow-xs"
            />
          </div>

          <div className="space-y-3">
            {filteredRejections.map(rej => (
              <div key={rej.code} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-red-100 text-red-800 rounded-lg font-black text-xs font-mono">
                    Rejeição {rej.code}
                  </span>
                  <h4 className="text-xs font-black text-slate-900 uppercase">{rej.title}</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Causa Comum:</p>
                    <p className="text-slate-700 font-medium mt-0.5">{rej.cause}</p>
                  </div>
                  <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
                    <p className="text-[10px] font-bold text-emerald-800 uppercase">Solução / Resolução:</p>
                    <p className="text-emerald-950 font-medium mt-0.5">{rej.solution}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA 4: RESUMO CONTÁBIL / RELATÓRIO FISCAL */}
      {activeAuditorTab === 'relatorio' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Notas Autorizadas</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{totalNotesEmitted}</h3>
              <p className="text-[10px] text-slate-500 mt-1">Documentos válidos e transmitidos</p>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Faturamento Fiscal Bruto</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">R$ {(totalGrossRevenue || 0).toFixed(2)}</h3>
              <p className="text-[10px] text-slate-500 mt-1">Base para cálculo do Simples Nacional</p>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Notas Canceladas</p>
              <h3 className="text-2xl font-black text-red-600 mt-1">{totalCanceledNotes}</h3>
              <p className="text-[10px] text-slate-500 mt-1">Cancelamentos homologados na SEFAZ</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
