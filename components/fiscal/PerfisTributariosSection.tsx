import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Tag, 
  Info, 
  FileText, 
  ShieldCheck, 
  Layers, 
  X, 
  Check, 
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import { TaxProfile } from '../../types';
import { 
  getStoredTaxProfiles, 
  saveTaxProfiles, 
  CRT_OPTIONS,
  ORIGIN_OPTIONS, 
  CSOSN_SIMPLES_OPTIONS, 
  CST_ICMS_NORMAL_OPTIONS, 
  CST_PIS_COFINS_OPTIONS,
  TIPO_OPERACAO_OPTIONS,
  DESTINO_OPERACAO_OPTIONS,
  TIPO_DESTINATARIO_OPTIONS,
  MODALIDADE_BC_OPTIONS,
  CST_IPI_OPTIONS,
  ISS_EXIGIBILIDADE_OPTIONS,
  ISS_REGIME_ESPECIAL_OPTIONS
} from '../../utils/taxProfiles';

interface PerfisTributariosSectionProps {
  tenantId?: string;
  showToast?: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const PerfisTributariosSection: React.FC<PerfisTributariosSectionProps> = ({
  tenantId,
  showToast = () => {}
}) => {
  const [profiles, setProfiles] = useState<TaxProfile[]>(() => getStoredTaxProfiles(tenantId));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<TaxProfile | null>(null);
  const [profileToDelete, setProfileToDelete] = useState<string | null>(null);
  const [expandedProfileId, setExpandedProfileId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<TaxProfile>>({
    name: '',
    description: '',
    crtTaxRegime: 'simples',
    crtCode: '1',
    csosnCst: '0102',
    origin: '0',
    cstPis: '49',
    cstCofins: '49',
    defaultCfopInternal: '5102',
    defaultCfopInterstate: '6102',
    icmsAliquota: 0,
    pisAliquota: 0,
    cofinsAliquota: 0,
    isDefault: false,
    tipoOperacao: 'saida',
    destinoOperacao: 'interna',
    tipoDestinatario: 'nao_contribuinte',
    modalidadeBc: 'op',
    mvaPercentual: 0,
    icmsStAliquotaDestino: 0,
    modalidadeBcSt: 'op',
    fcpAliquota: 0,
    pisTipoCalculo: 'percentual',
    cofinsTipoCalculo: 'percentual',
    cstIpi: '99',
    cEnqIpi: '999',
    issExigibilidade: 'exigivel',
    issRegimeEspecial: 'mei',
    issAliquota: 0,
    issRetencao: false,
    issResponsavelRetencao: 'prestador'
  });

  useEffect(() => {
    setProfiles(getStoredTaxProfiles(tenantId));
  }, [tenantId]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      showToast('Digite um nome para o perfil tributário.', 'error');
      return;
    }

    // Bloqueio de Divergência CRT vs CST/CSOSN (Motor de Amortecimento de Erros)
    const currentCrt = formData.crtCode || (formData.crtTaxRegime === 'normal' ? '3' : '1');
    const isSimplesOrMei = currentCrt === '1' || currentCrt === '4';
    const isCst = (formData.csosnCst || '').length <= 2; // CST ICMS tem 2 dígitos (ex: 00, 60), CSOSN tem 3 ou 4 (ex: 102, 500)

    if (isSimplesOrMei && isCst) {
      showToast('Bloqueio: Empresas do Simples Nacional ou MEI (CRT 1 ou 4) não podem usar CST de ICMS normal. Escolha um CSOSN (ex: 102, 500).', 'error');
      return;
    }
    if (!isSimplesOrMei && !isCst) {
      showToast('Bloqueio: Empresas de Regime Normal ou Simples com Excesso (CRT 3 ou 2) devem usar CST de ICMS (ex: 00, 60). Escolha um CST.', 'error');
      return;
    }

    // Se a empresa for MEI (CRT 4), força retenção de ISS como falso
    const isMei = currentCrt === '4';
    const finalFormData = {
      ...formData,
      issRetencao: isMei ? false : !!formData.issRetencao,
      issResponsavelRetencao: isMei ? undefined : formData.issResponsavelRetencao
    };

    let updated: TaxProfile[] = [];
    if (editingProfile) {
      updated = profiles.map(p => p.id === editingProfile.id ? { ...p, ...finalFormData } as TaxProfile : p);
      showToast('Perfil tributário atualizado com sucesso!');
    } else {
      const newProf: TaxProfile = {
        id: 'tp_custom_' + Date.now().toString(36),
        tenantId,
        name: formData.name.trim(),
        description: formData.description?.trim() || '',
        crtTaxRegime: formData.crtTaxRegime || 'simples',
        crtCode: formData.crtCode || (formData.crtTaxRegime === 'normal' ? '3' : '1'),
        csosnCst: formData.csosnCst || '0102',
        origin: formData.origin || '0',
        cstPis: formData.cstPis || '49',
        cstCofins: formData.cstCofins || '49',
        defaultCfopInternal: formData.defaultCfopInternal || '5102',
        defaultCfopInterstate: formData.defaultCfopInterstate || '6102',
        icmsAliquota: Number(formData.icmsAliquota) || 0,
        pisAliquota: Number(formData.pisAliquota) || 0,
        cofinsAliquota: Number(formData.cofinsAliquota) || 0,
        isDefault: !!formData.isDefault,
        tipoOperacao: formData.tipoOperacao || 'saida',
        destinoOperacao: formData.destinoOperacao || 'interna',
        tipoDestinatario: formData.tipoDestinatario || 'nao_contribuinte',
        modalidadeBc: formData.modalidadeBc || 'op',
        mvaPercentual: Number(formData.mvaPercentual) || 0,
        icmsStAliquotaDestino: Number(formData.icmsStAliquotaDestino) || 0,
        modalidadeBcSt: formData.modalidadeBcSt || 'op',
        fcpAliquota: Number(formData.fcpAliquota) || 0,
        pisTipoCalculo: formData.pisTipoCalculo || 'percentual',
        cofinsTipoCalculo: formData.cofinsTipoCalculo || 'percentual',
        cstIpi: formData.cstIpi || '99',
        cEnqIpi: formData.cEnqIpi || '999',
        issExigibilidade: formData.issExigibilidade || 'exigivel',
        issRegimeEspecial: formData.issRegimeEspecial || 'mei',
        issAliquota: Number(formData.issAliquota) || 0,
        issRetencao: isMei ? false : !!formData.issRetencao,
        issResponsavelRetencao: isMei ? undefined : formData.issResponsavelRetencao || 'prestador',
        itemLc116: formData.itemLc116 || '',
        codigoTributacaoNacional: formData.codigoTributacaoNacional || ''
      };
      if (formData.isDefault) {
        updated = profiles.map(p => ({ ...p, isDefault: false }));
      }
      updated = [newProf, ...updated];
      showToast('Novo perfil tributário criado!');
    }

    setProfiles(updated);
    saveTaxProfiles(tenantId, updated);
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setEditingProfile(null);
    setFormData({
      name: '',
      description: '',
      crtTaxRegime: 'simples',
      crtCode: '1',
      csosnCst: '0102',
      origin: '0',
      cstPis: '49',
      cstCofins: '49',
      defaultCfopInternal: '5102',
      defaultCfopInterstate: '6102',
      icmsAliquota: 0,
      pisAliquota: 0,
      cofinsAliquota: 0,
      isDefault: false,
      tipoOperacao: 'saida',
      destinoOperacao: 'interna',
      tipoDestinatario: 'nao_contribuinte',
      modalidadeBc: 'op',
      mvaPercentual: 0,
      icmsStAliquotaDestino: 0,
      modalidadeBcSt: 'op',
      fcpAliquota: 0,
      pisTipoCalculo: 'percentual',
      cofinsTipoCalculo: 'percentual',
      cstIpi: '99',
      cEnqIpi: '999',
      issExigibilidade: 'exigivel',
      issRegimeEspecial: 'mei',
      issAliquota: 0,
      issRetencao: false,
      issResponsavelRetencao: 'prestador'
    });
  };

  const handleStartEdit = (p: TaxProfile) => {
    setEditingProfile(p);
    setFormData({ ...p });
    setIsModalOpen(true);
  };

  const handleDeleteProfile = (id: string) => {
    const updated = profiles.filter(p => p.id !== id);
    setProfiles(updated);
    saveTaxProfiles(tenantId, updated);
    setProfileToDelete(null);
    showToast('Perfil tributário removido.', 'info');
  };

  const handleSetDefault = (p: TaxProfile) => {
    const updated = profiles.map(item => ({
      ...item,
      isDefault: item.id === p.id
    }));
    setProfiles(updated);
    saveTaxProfiles(tenantId, updated);
    showToast(`"${p.name}" agora é o Perfil Padrão!`);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Banner Explicativo */}
      <div className="bg-gradient-to-r from-blue-900/90 via-indigo-900/80 to-slate-900 text-white rounded-3xl p-5 md:p-6 border border-blue-500/30 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 bg-blue-600/30 rounded-2xl border border-blue-400/40 flex items-center justify-center text-blue-300 shrink-0 shadow-inner">
              <Sparkles size={24} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-black uppercase tracking-tight">Perfis Tributários & Regras Fiscais</h2>
                <span className="bg-amber-400 text-slate-950 text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-xs">
                  Automação Dica de Ouro
                </span>
              </div>
              <p className="text-xs text-slate-200 mt-1 max-w-2xl leading-relaxed font-medium">
                Vincule o produto a um Perfil Tributário para preencher automaticamente <strong>Origem (0-8)</strong>, <strong>CSOSN/CST (ICMS)</strong>, <strong>CST PIS</strong>, <strong>CST COFINS</strong> e <strong>CFOP</strong>. A conversão de CFOP para vendas de outro estado (ex: 5.102 ➔ 6.102) é feita 100% de forma automática pelo ERP!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-600/30 active:scale-95 transition-all flex items-center gap-2 shrink-0 cursor-pointer border border-blue-400/40"
          >
            <Plus size={16} />
            <span>Criar Perfil Tributário</span>
          </button>
        </div>
      </div>

      {/* Grid de Perfis Tributários Cadastrados */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {profiles.map((p) => (
          <div 
            key={p.id}
            className={`bg-white rounded-3xl p-5 border transition-all flex flex-col justify-between shadow-sm relative group hover:shadow-md ${
              p.isDefault ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-100'
            }`}
          >
            <div>
              {/* Badge Padrão */}
              <div className="flex items-center justify-between mb-3 gap-2">
                <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1 ${
                  p.crtTaxRegime === 'normal'
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}>
                  <Tag size={10} />
                  <span>{p.crtTaxRegime === 'normal' ? 'Regime Normal (CST)' : 'Simples Nacional (CSOSN)'}</span>
                </span>

                {p.isDefault ? (
                  <span className="text-[8px] font-black uppercase bg-blue-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                    <CheckCircle2 size={10} />
                    <span>Perfil Padrão</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(p)}
                    className="text-[8px] font-black uppercase text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 px-2 py-0.5 rounded-full transition-all cursor-pointer"
                  >
                    Definir Padrão
                  </button>
                )}
              </div>

              <h3 className="font-black text-slate-900 text-sm leading-tight mb-1">{p.name}</h3>
              {p.description && (
                <p className="text-[11px] text-slate-500 leading-snug mb-4 line-clamp-2">{p.description}</p>
              )}

              {/* Tabela de Parâmetros Obrigatórios */}
              <div className="bg-slate-50 rounded-2xl p-3 space-y-2 border border-slate-100 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold uppercase text-[9px]">Código CRT (Regime):</span>
                  <span className="font-mono font-black text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {p.crtCode || (p.crtTaxRegime === 'normal' ? '3' : '1')} - {
                      (p.crtCode || (p.crtTaxRegime === 'normal' ? '3' : '1')) === '1' ? 'Simples Nacional' :
                      (p.crtCode || (p.crtTaxRegime === 'normal' ? '3' : '1')) === '2' ? 'Simples - Excesso' :
                      (p.crtCode || (p.crtTaxRegime === 'normal' ? '3' : '1')) === '3' ? 'Regime Normal' : 'MEI'
                    }
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold uppercase text-[9px]">1. CSOSN / CST (ICMS):</span>
                  <span className="font-mono font-black text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {p.csosnCst}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold uppercase text-[9px]">2. Origem Mercadoria:</span>
                  <span className="font-mono font-black text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    Dígito {p.origin}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold uppercase text-[9px]">3. CST PIS / COFINS:</span>
                  <span className="font-mono font-black text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    PIS: {p.cstPis} • COFINS: {p.cstCofins}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
                  <span className="text-slate-500 font-bold uppercase text-[9px]">4. CFOP Saída Estadual:</span>
                  <span className="font-mono font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {p.defaultCfopInternal}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold uppercase text-[9px]">5. CFOP Interestadual (Auto):</span>
                  <span className="font-mono font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    {p.defaultCfopInterstate || (p.defaultCfopInternal?.startsWith('5') ? '6' + p.defaultCfopInternal.slice(1) : '6102')}
                  </span>
                </div>

                {/* Parâmetros Avançados Toggles */}
                <div className="border-t border-slate-200/60 pt-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setExpandedProfileId(expandedProfileId === p.id ? null : p.id)}
                    className="w-full flex items-center justify-between text-[8px] font-black uppercase text-slate-500 hover:text-blue-600 tracking-wider transition-colors cursor-pointer"
                  >
                    <span>Configurações Avançadas</span>
                    <span>{expandedProfileId === p.id ? 'Ocultar ▲' : 'Ver Detalhes ▼'}</span>
                  </button>

                  {expandedProfileId === p.id && (
                    <div className="mt-2 space-y-1.5 text-[10px] text-slate-600 bg-slate-100/50 p-2.5 rounded-xl border border-slate-200/40 animate-in slide-in-from-top-1 duration-150">
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-bold uppercase text-[8px]">Operação / Destino:</span>
                        <span className="font-semibold text-slate-800">
                          {p.tipoOperacao === 'entrada' ? 'Entrada' : 'Saída'} • {
                            p.destinoOperacao === 'exterior' ? 'Exterior' :
                            p.destinoOperacao === 'interestadual' ? 'Interestadual' : 'Interna'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-bold uppercase text-[8px]">Destinatário:</span>
                        <span className="font-semibold text-slate-800">
                          {p.tipoDestinatario === 'contribuinte' ? 'Contribuinte' :
                           p.tipoDestinatario === 'produtor_rural' ? 'Produtor Rural' : 'Não Contribuinte'}
                        </span>
                      </div>
                      {(p.mvaPercentual !== undefined && p.mvaPercentual > 0) && (
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-bold uppercase text-[8px]">MVA / Alíquota ST:</span>
                          <span className="font-semibold text-slate-800">{p.mvaPercentual}% MVA • {p.icmsStAliquotaDestino}% ST</span>
                        </div>
                      )}
                      {(p.fcpAliquota !== undefined && p.fcpAliquota > 0) && (
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-bold uppercase text-[8px]">FCP Alíquota:</span>
                          <span className="font-semibold text-slate-800">{p.fcpAliquota}%</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-bold uppercase text-[8px]">IPI (CST / cEnq):</span>
                        <span className="font-semibold text-slate-800">CST {p.cstIpi || '99'} • cEnq {p.cEnqIpi || '999'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-bold uppercase text-[8px]">ISS Exigibilidade:</span>
                        <span className="font-semibold text-slate-800 capitalize">{p.issExigibilidade || 'Exigível'}</span>
                      </div>
                      {(p.issAliquota !== undefined && p.issAliquota > 0) && (
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-bold uppercase text-[8px]">ISS Alíquota:</span>
                          <span className="font-semibold text-slate-800">{p.issAliquota}% {p.issRetencao ? '(Retido)' : ''}</span>
                        </div>
                      )}
                      {(p.itemLc116 || p.codigoTributacaoNacional) && (
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-bold uppercase text-[8px]">LC 116 / CTN:</span>
                          <span className="font-mono text-slate-800">{p.itemLc116 || 'N/D'} {p.codigoTributacaoNacional ? `• ${p.codigoTributacaoNacional}` : ''}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={() => handleStartEdit(p)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
              >
                <Edit3 size={12} />
                <span>Editar</span>
              </button>
              {!p.isDefault && (
                <button
                  type="button"
                  onClick={() => setProfileToDelete(p.id)}
                  className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Trash2 size={12} />
                  <span>Excluir</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Criação e Edição de Perfil Tributário */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 border border-slate-100 my-auto">
            
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Tag size={18} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base uppercase tracking-tight">
                    {editingProfile ? 'Editar Perfil Tributário' : 'Novo Perfil Tributário'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Regras fiscais automatizadas do produto</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)} 
                className="p-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors active:scale-95 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

             <form onSubmit={handleSaveProfile} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              
              {/* SEÇÃO 1: Identificação e Regras de Ativação (Gerais) */}
              <div className="bg-slate-50/50 p-4 rounded-3xl border border-slate-200/60 space-y-4">
                <h4 className="text-[11px] font-black text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-blue-600 rounded-xs"></span>
                  <span>1. Identificação e Ativação (Regras Gerais)</span>
                </h4>

                {/* Nome do Perfil */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Nome do Perfil <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                    placeholder="Ex: Venda Geral MEI, Venda Contribuinte RS"
                    className="w-full p-3 bg-white rounded-xl outline-none font-bold text-xs text-slate-900 focus:ring-2 focus:ring-blue-600 border border-slate-200"
                  />
                </div>

                {/* Descrição */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição Curta</label>
                  <input
                    type="text"
                    value={formData.description || ''}
                    onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                    placeholder="Ex: Utilizado para vendas internas de produtos sem substituição tributária"
                    className="w-full p-3 bg-white rounded-xl outline-none font-medium text-xs text-slate-700 focus:ring-2 focus:ring-blue-600 border border-slate-200"
                  />
                </div>

                {/* CRT Regime Tributário */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Regime da Empresa (CRT)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData(f => ({ ...f, crtTaxRegime: 'simples', crtCode: '1', csosnCst: '0102' }))}
                      className={`py-2 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer border ${
                        (formData.crtCode || '1') === '1'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-[10px] font-black">CRT 1</span>
                      <span className="text-[9px] opacity-90 font-bold">Simples Nacional</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(f => ({ ...f, crtTaxRegime: 'simples', crtCode: '4', csosnCst: '0102' }))}
                      className={`py-2 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer border ${
                        formData.crtCode === '4'
                          ? 'bg-sky-600 text-white border-sky-600 shadow-md'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-[10px] font-black">CRT 4</span>
                      <span className="text-[9px] opacity-90 font-bold">MEI (Microempreendedor)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(f => ({ ...f, crtTaxRegime: 'normal', crtCode: '3', csosnCst: '00' }))}
                      className={`py-2 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer border ${
                        formData.crtCode === '3'
                          ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-[10px] font-black">CRT 3</span>
                      <span className="text-[9px] opacity-90 font-bold">Regime Normal (CST)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(f => ({ ...f, crtTaxRegime: 'normal', crtCode: '2', csosnCst: '00' }))}
                      className={`py-2 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer border ${
                        formData.crtCode === '2'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-[10px] font-black">CRT 2</span>
                      <span className="text-[9px] opacity-90 font-bold">Simples - Excesso</span>
                    </button>
                  </div>
                </div>

                {/* Código CRT Detalhado */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Código de Regime Tributário (CRT) <span className="text-red-500">*</span></label>
                  <select
                    value={formData.crtCode || (formData.crtTaxRegime === 'normal' ? '3' : '1')}
                    onChange={(e) => {
                      const code = e.target.value;
                      const regime = (code === '3' || code === '2') ? 'normal' : 'simples';
                      const defaultCst = regime === 'normal' ? '00' : '0102';
                      setFormData(f => ({ ...f, crtCode: code, crtTaxRegime: regime, csosnCst: defaultCst }));
                    }}
                    className="w-full p-2.5 bg-white rounded-xl outline-none font-bold text-xs text-slate-900 border border-slate-200 focus:ring-2 focus:ring-blue-600"
                  >
                    {CRT_OPTIONS.map(opt => (
                      <option key={opt.code} value={opt.code}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Tipo de Operação, Destino e Tipo Destinatário */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Operação</label>
                    <select
                      value={formData.tipoOperacao || 'saida'}
                      onChange={(e) => setFormData(f => ({ ...f, tipoOperacao: e.target.value as any }))}
                      className="w-full p-2.5 bg-white rounded-xl outline-none font-bold text-[11px] text-slate-900 border border-slate-200"
                    >
                      {TIPO_OPERACAO_OPTIONS.map(opt => (
                        <option key={opt.code} value={opt.code}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Destino da Operação</label>
                    <select
                      value={formData.destinoOperacao || 'interna'}
                      onChange={(e) => {
                        const dest = e.target.value as any;
                        let internalCfop = formData.defaultCfopInternal || '5102';
                        let interstateCfop = formData.defaultCfopInterstate || '6102';
                        // Sugere CFOP baseado na nova regra automática Tipo + Destino
                        if (dest === 'interestadual' && internalCfop.startsWith('5')) {
                          interstateCfop = '6' + internalCfop.slice(1);
                        } else if (dest === 'interna' && interstateCfop.startsWith('6')) {
                          internalCfop = '5' + interstateCfop.slice(1);
                        }
                        setFormData(f => ({ ...f, destinoOperacao: dest, defaultCfopInternal: internalCfop, defaultCfopInterstate: interstateCfop }));
                      }}
                      className="w-full p-2.5 bg-white rounded-xl outline-none font-bold text-[11px] text-slate-900 border border-slate-200"
                    >
                      {DESTINO_OPERACAO_OPTIONS.map(opt => (
                        <option key={opt.code} value={opt.code}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo do Destinatário</label>
                    <select
                      value={formData.tipoDestinatario || 'nao_contribuinte'}
                      onChange={(e) => setFormData(f => ({ ...f, tipoDestinatario: e.target.value as any }))}
                      className="w-full p-2.5 bg-white rounded-xl outline-none font-bold text-[11px] text-slate-900 border border-slate-200"
                    >
                      {TIPO_DESTINATARIO_OPTIONS.map(opt => (
                        <option key={opt.code} value={opt.code}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* SEÇÃO 2: Configurações de ICMS / CSOSN */}
              <div className="bg-slate-50/50 p-4 rounded-3xl border border-slate-200/60 space-y-4">
                <h4 className="text-[11px] font-black text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-emerald-500 rounded-xs"></span>
                  <span>2. Configurações de ICMS / CSOSN</span>
                </h4>

                {/* CSOSN / CST Select */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    {formData.crtTaxRegime === 'simples' ? 'CSOSN (Regime Simples/MEI)' : 'CST ICMS (Regime Normal)'}
                  </label>
                  <select
                    value={formData.csosnCst || (formData.crtTaxRegime === 'simples' ? '0102' : '00')}
                    onChange={(e) => {
                      const val = e.target.value;
                      let defaultCfop = formData.defaultCfopInternal || '5102';
                      if (val === '0500' || val === '60') {
                        defaultCfop = '5405';
                      } else if (val === '0102' || val === '00' || val === '0101') {
                        defaultCfop = '5102';
                      }
                      const interstateCfop = defaultCfop.startsWith('5') ? '6' + defaultCfop.slice(1) : '6102';
                      setFormData(f => ({
                        ...f,
                        csosnCst: val,
                        defaultCfopInternal: defaultCfop,
                        defaultCfopInterstate: interstateCfop
                      }));
                    }}
                    className="w-full p-2.5 bg-white rounded-xl outline-none font-bold text-xs text-slate-900 border border-slate-200 focus:ring-2 focus:ring-blue-600"
                  >
                    {formData.crtTaxRegime === 'simples' ? (
                      CSOSN_SIMPLES_OPTIONS.map(opt => (
                        <option key={opt.code} value={opt.code}>{opt.label}</option>
                      ))
                    ) : (
                      CST_ICMS_NORMAL_OPTIONS.map(opt => (
                        <option key={opt.code} value={opt.code}>{opt.label}</option>
                      ))
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Alíquota de ICMS */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Alíquota de ICMS (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.icmsAliquota || 0}
                      onChange={(e) => setFormData(f => ({ ...f, icmsAliquota: parseFloat(e.target.value) || 0 }))}
                      className="w-full p-2.5 bg-white rounded-xl outline-none font-bold text-xs text-slate-900 border border-slate-200"
                    />
                  </div>

                  {/* Modalidade de Determinação da BC */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Det. BC ICMS</label>
                    <select
                      value={formData.modalidadeBc || 'op'}
                      onChange={(e) => setFormData(f => ({ ...f, modalidadeBc: e.target.value as any }))}
                      className="w-full p-2.5 bg-white rounded-xl outline-none font-bold text-[11px] text-slate-900 border border-slate-200"
                    >
                      {MODALIDADE_BC_OPTIONS.map(opt => (
                        <option key={opt.code} value={opt.code}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Alíquota FCP */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Alíquota FCP (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Fundo Combate Pobreza"
                      value={formData.fcpAliquota || 0}
                      onChange={(e) => setFormData(f => ({ ...f, fcpAliquota: parseFloat(e.target.value) || 0 }))}
                      className="w-full p-2.5 bg-white rounded-xl outline-none font-bold text-xs text-slate-900 border border-slate-200"
                    />
                  </div>
                </div>

                {/* Sub-seção Substituição Tributária (ICMS-ST) */}
                <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-200/50 space-y-3">
                  <span className="text-[9px] font-black text-emerald-800 uppercase tracking-wider block">Campos para Substituição Tributária (ICMS-ST)</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-emerald-700 uppercase">Percentual MVA (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Margem V. Agregado"
                        value={formData.mvaPercentual || 0}
                        onChange={(e) => setFormData(f => ({ ...f, mvaPercentual: parseFloat(e.target.value) || 0 }))}
                        className="w-full p-2 bg-white rounded-xl outline-none font-bold text-xs text-slate-900 border border-slate-200"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-emerald-700 uppercase">Aliq. Interna ST Dest. (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="ICMS-ST Destino"
                        value={formData.icmsStAliquotaDestino || 0}
                        onChange={(e) => setFormData(f => ({ ...f, icmsStAliquotaDestino: parseFloat(e.target.value) || 0 }))}
                        className="w-full p-2 bg-white rounded-xl outline-none font-bold text-xs text-slate-900 border border-slate-200"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-emerald-700 uppercase">Det. BC ICMS-ST</label>
                      <select
                        value={formData.modalidadeBcSt || 'op'}
                        onChange={(e) => setFormData(f => ({ ...f, modalidadeBcSt: e.target.value as any }))}
                        className="w-full p-2 bg-white rounded-xl outline-none font-bold text-[11px] text-slate-900 border border-slate-200"
                      >
                        {MODALIDADE_BC_OPTIONS.map(opt => (
                          <option key={opt.code} value={opt.code}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* SEÇÃO 3 & 4: Configurações de PIS e COFINS */}
              <div className="bg-slate-50/50 p-4 rounded-3xl border border-slate-200/60 space-y-4">
                <h4 className="text-[11px] font-black text-sky-600 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-sky-500 rounded-xs"></span>
                  <span>3 & 4. Configurações de PIS / COFINS</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* PIS */}
                  <div className="space-y-3 p-3 bg-white rounded-2xl border border-slate-100">
                    <span className="text-[9px] font-black text-sky-700 uppercase tracking-widest block">Tributação de PIS</span>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">CST de PIS (2 dígitos)</label>
                      <select
                        value={formData.cstPis || '49'}
                        onChange={(e) => setFormData(f => ({ ...f, cstPis: e.target.value }))}
                        className="w-full p-2 bg-slate-50 rounded-xl outline-none font-bold text-xs text-slate-900 border border-slate-200"
                      >
                        {CST_PIS_COFINS_OPTIONS.map(opt => (
                          <option key={opt.code} value={opt.code}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase">Tipo Cálculo</label>
                        <select
                          value={formData.pisTipoCalculo || 'percentual'}
                          onChange={(e) => setFormData(f => ({ ...f, pisTipoCalculo: e.target.value as any }))}
                          className="w-full p-2 bg-slate-50 rounded-xl outline-none font-bold text-[10px] text-slate-900 border border-slate-200"
                        >
                          <option value="percentual">Percentual (%)</option>
                          <option value="valor">Em Valor (R$)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase">Alíquota</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={formData.pisAliquota || 0}
                          onChange={(e) => setFormData(f => ({ ...f, pisAliquota: parseFloat(e.target.value) || 0 }))}
                          className="w-full p-2 bg-slate-50 rounded-xl outline-none font-bold text-xs text-slate-900 border border-slate-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* COFINS */}
                  <div className="space-y-3 p-3 bg-white rounded-2xl border border-slate-100">
                    <span className="text-[9px] font-black text-sky-700 uppercase tracking-widest block">Tributação de COFINS</span>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">CST de COFINS (2 dígitos)</label>
                      <select
                        value={formData.cstCofins || '49'}
                        onChange={(e) => setFormData(f => ({ ...f, cstCofins: e.target.value }))}
                        className="w-full p-2 bg-slate-50 rounded-xl outline-none font-bold text-xs text-slate-900 border border-slate-200"
                      >
                        {CST_PIS_COFINS_OPTIONS.map(opt => (
                          <option key={opt.code} value={opt.code}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase">Tipo Cálculo</label>
                        <select
                          value={formData.cofinsTipoCalculo || 'percentual'}
                          onChange={(e) => setFormData(f => ({ ...f, cofinsTipoCalculo: e.target.value as any }))}
                          className="w-full p-2 bg-slate-50 rounded-xl outline-none font-bold text-[10px] text-slate-900 border border-slate-200"
                        >
                          <option value="percentual">Percentual (%)</option>
                          <option value="valor">Em Valor (R$)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase">Alíquota</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={formData.cofinsAliquota || 0}
                          onChange={(e) => setFormData(f => ({ ...f, cofinsAliquota: parseFloat(e.target.value) || 0 }))}
                          className="w-full p-2 bg-slate-50 rounded-xl outline-none font-bold text-xs text-slate-900 border border-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SEÇÃO 5: Configurações de IPI */}
              <div className="bg-slate-50/50 p-4 rounded-3xl border border-slate-200/60 space-y-4">
                <h4 className="text-[11px] font-black text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-amber-500 rounded-xs"></span>
                  <span>5. Configurações de IPI</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CST de IPI</label>
                    <select
                      value={formData.cstIpi || '99'}
                      onChange={(e) => setFormData(f => ({ ...f, cstIpi: e.target.value }))}
                      className="w-full p-2.5 bg-white rounded-xl outline-none font-bold text-xs text-slate-900 border border-slate-200"
                    >
                      {CST_IPI_OPTIONS.map(opt => (
                        <option key={opt.code} value={opt.code}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Código de Enquadramento do IPI (cEnq)</label>
                    <input
                      type="text"
                      maxLength={3}
                      value={formData.cEnqIpi || '999'}
                      onChange={(e) => setFormData(f => ({ ...f, cEnqIpi: e.target.value.replace(/\D/g, '') }))}
                      placeholder="Ex: 999"
                      className="w-full p-2.5 bg-white rounded-xl outline-none font-bold text-xs font-mono text-slate-900 border border-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* SEÇÃO 6: Configurações de ISS / NFS-e */}
              <div className="bg-slate-50/50 p-4 rounded-3xl border border-slate-200/60 space-y-4">
                <h4 className="text-[11px] font-black text-purple-600 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-purple-500 rounded-xs"></span>
                  <span>6. Configurações de ISS / NFS-e (Serviços)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Exigibilidade ISS</label>
                    <select
                      value={formData.issExigibilidade || 'exigivel'}
                      onChange={(e) => setFormData(f => ({ ...f, issExigibilidade: e.target.value as any }))}
                      className="w-full p-2.5 bg-white rounded-xl outline-none font-bold text-[11px] text-slate-900 border border-slate-200"
                    >
                      {ISS_EXIGIBILIDADE_OPTIONS.map(opt => (
                        <option key={opt.code} value={opt.code}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Regime Especial</label>
                    <select
                      value={formData.issRegimeEspecial || 'mei'}
                      onChange={(e) => setFormData(f => ({ ...f, issRegimeEspecial: e.target.value as any }))}
                      className="w-full p-2.5 bg-white rounded-xl outline-none font-bold text-[11px] text-slate-900 border border-slate-200"
                    >
                      {ISS_REGIME_ESPECIAL_OPTIONS.map(opt => (
                        <option key={opt.code} value={opt.code}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Alíquota do ISS (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.issAliquota || 0}
                      onChange={(e) => setFormData(f => ({ ...f, issAliquota: parseFloat(e.target.value) || 0 }))}
                      className="w-full p-2.5 bg-white rounded-xl outline-none font-bold text-xs text-slate-900 border border-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Item da Lista de Serviços (LC 116/03)</label>
                    <input
                      type="text"
                      value={formData.itemLc116 || ''}
                      onChange={(e) => setFormData(f => ({ ...f, itemLc116: e.target.value }))}
                      placeholder="Ex: 07.02 ou 14.01"
                      className="w-full p-2.5 bg-white rounded-xl outline-none font-bold text-xs text-slate-900 border border-slate-200"
                    />
                    <p className="text-[9px] text-slate-400">Obrigatório para emissão de NFS-e</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Código de Tributação Nacional (CTN)</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={formData.codigoTributacaoNacional || ''}
                      onChange={(e) => setFormData(f => ({ ...f, codigoTributacaoNacional: e.target.value.replace(/\D/g, '') }))}
                      placeholder="Ex: 010101 (6 dígitos)"
                      className="w-full p-2.5 bg-white rounded-xl outline-none font-bold text-xs font-mono text-slate-900 border border-slate-200"
                    />
                    <p className="text-[9px] text-slate-400">Obrigatório no Padrão Nacional</p>
                  </div>
                </div>

                <div className="p-3 bg-purple-50/50 rounded-2xl border border-purple-200/50 space-y-3">
                  {(formData.crtCode || (formData.crtTaxRegime === 'simples' ? '1' : '3')) === '4' ? (
                    <div className="text-[11px] font-bold text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200 leading-relaxed">
                      ⚠️ <strong>Retenção de ISS Bloqueada (MEI):</strong> Por lei (Lei Complementar nº 123/2006), o ISS do MEI nunca pode ser retido na fonte pelo tomador. O ERP força o campo retido como <strong>Não</strong>.
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!formData.issRetencao}
                            onChange={(e) => setFormData(f => ({ ...f, issRetencao: e.target.checked }))}
                            className="w-4 h-4 rounded text-purple-600 border-slate-300 focus:ring-purple-500"
                          />
                          <span className="text-[11px] font-black text-purple-950 uppercase">Retenção de ISS</span>
                        </label>
                      </div>

                      {formData.issRetencao && (
                        <div className="space-y-1 animate-in fade-in">
                          <label className="text-[9px] font-bold text-purple-700 uppercase">Responsável pelo Recolhimento</label>
                          <select
                            value={formData.issResponsavelRetencao || 'prestador'}
                            onChange={(e) => setFormData(f => ({ ...f, issResponsavelRetencao: e.target.value as any }))}
                            className="w-full p-2 bg-white rounded-xl outline-none font-bold text-[11px] text-slate-900 border border-slate-200"
                          >
                            <option value="prestador">Prestador (Sua Empresa)</option>
                            <option value="tomador">Tomador (Cliente)</option>
                          </select>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* 4. CFOP Padrão (Estadual & Interestadual) */}
              <div className="bg-slate-50/50 p-4 rounded-3xl border border-slate-200/60 space-y-3">
                <h4 className="text-[11px] font-black text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-blue-500 rounded-xs"></span>
                  <span>7. Vínculos de CFOP Sugeridos</span>
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-blue-900 uppercase tracking-wider">CFOP Padrão Interno (Estadual)</label>
                    <input
                      type="text"
                      value={formData.defaultCfopInternal || '5102'}
                      onChange={(e) => {
                        const val = e.target.value;
                        const interstate = val.startsWith('5') ? '6' + val.slice(1) : val;
                        setFormData(f => ({
                          ...f,
                          defaultCfopInternal: val,
                          defaultCfopInterstate: interstate
                        }));
                      }}
                      placeholder="Ex: 5102 ou 5405"
                      className="w-full p-3 bg-white rounded-xl font-mono font-black text-xs text-blue-700 outline-none border border-blue-200"
                    />
                    <p className="text-[9px] text-blue-600 font-medium">Vendas dentro do estado</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-purple-900 uppercase tracking-wider">CFOP Interestadual (Auto)</label>
                    <input
                      type="text"
                      value={formData.defaultCfopInterstate || (formData.defaultCfopInternal?.startsWith('5') ? '6' + formData.defaultCfopInternal.slice(1) : '6102')}
                      onChange={(e) => setFormData(f => ({ ...f, defaultCfopInterstate: e.target.value }))}
                      placeholder="Ex: 6102 ou 6405"
                      className="w-full p-3 bg-white rounded-xl font-mono font-black text-xs text-purple-700 outline-none border border-purple-200"
                    />
                    <p className="text-[9px] text-purple-600 font-medium">Vendas para outros estados</p>
                  </div>
                </div>
              </div>

              {/* Checkbox Perfil Padrão */}
              <label className="flex items-center gap-2 pt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!formData.isDefault}
                  onChange={(e) => setFormData(f => ({ ...f, isDefault: e.target.checked }))}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <span className="text-xs font-bold text-slate-800">Definir este como o Perfil Tributário Padrão ao cadastrar novos produtos</span>
              </label>

              {/* Botões do Formulário */}
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-wider transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25 transition-all"
                >
                  {editingProfile ? 'Atualizar Perfil' : 'Salvar Perfil'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Exclusão */}
      {profileToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 z-[220] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <h4 className="font-black text-slate-900 text-sm uppercase">Excluir Perfil Tributário?</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Esta ação removerá a regra fiscal customizada. Os produtos já cadastrados manterão seus valores salvos.
            </p>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setProfileToDelete(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-xs uppercase"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDeleteProfile(profileToDelete)}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black text-xs uppercase shadow-md"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
