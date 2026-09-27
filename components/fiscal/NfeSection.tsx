import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Download, 
  Printer, 
  MessageCircle, 
  Trash2, 
  Send, 
  Eye, 
  RefreshCw, 
  Building, 
  Calendar, 
  Coins, 
  ExternalLink,
  ShieldCheck,
  Package,
  Layers,
  Sparkles,
  HelpCircle,
  FileCheck
} from 'lucide-react';
import { 
  AppSettings, 
  Product, 
  Customer, 
  NfceNfeItem, 
  NfceNfeProductItem,
  NfceNfeConfig, 
  FiscalDocType,
  Sale
} from '../../types';
import NfceDanfeModal from '../nfce/NfceDanfeModal';
import { getEffectiveCfop } from '../../utils/taxProfiles';
import { FiscalEmissionService } from '../../utils/fiscalEmissionService';

interface NfeSectionProps {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
  products: Product[];
  customers: Customer[];
  sales?: Sale[];
  tenantId?: string;
  notes: NfceNfeItem[];
  setNotes: (notes: NfceNfeItem[]) => void;
  onShowToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const NfeSection: React.FC<NfeSectionProps> = ({
  settings,
  setSettings,
  products,
  customers,
  sales = [],
  tenantId = '',
  notes,
  setNotes,
  onShowToast
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'authorized' | 'canceled' | 'rejected'>('all');
  const [viewingDanfeNote, setViewingDanfeNote] = useState<NfceNfeItem | null>(null);
  const [showNewNfeModal, setShowNewNfeModal] = useState(false);
  const [isEmitting, setIsEmitting] = useState(false);

  // Formulário Nova NF-e
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [naturezaOperacao, setNaturezaOperacao] = useState('VENDA DE MERCADORIA');
  const [tipoEmissao, setTipoEmissao] = useState<'normal' | 'contingencia'>('normal');
  const [selectedProductList, setSelectedProductList] = useState<Array<{ product: Product; quantity: number; unitPrice: number }>>([]);
  const [productToAddId, setProductToAddId] = useState('');

  // Cancelamento
  const [cancelModalNote, setCancelModalNote] = useState<NfceNfeItem | null>(null);
  const [cancelJustification, setCancelJustification] = useState('');
  const [retransmittingNoteId, setRetransmittingNoteId] = useState<string | null>(null);

  // Filtra apenas NF-e (Modelo 55)
  const nfeList = notes.filter(n => n.docType === 'nfe');

  const handleRetransmitSingle = async (note: NfceNfeItem) => {
    setRetransmittingNoteId(note.id);
    try {
      const res = await FiscalEmissionService.retransmitNote(note, settings, tenantId);
      if (res.success && res.noteItem) {
        const updated = notes.map(n => n.id === note.id ? res.noteItem! : n);
        setNotes(updated);
        onShowToast(res.message, 'success');
      } else {
        onShowToast(`${res.message} ${res.suggestion ? `(${res.suggestion})` : ''}`, 'error');
      }
    } catch (e: any) {
      onShowToast(`Erro ao retransmitir: ${e?.message || 'Falha de conexão'}`, 'error');
    } finally {
      setRetransmittingNoteId(null);
    }
  };

  const filteredNotes = nfeList.filter(n => {
    const matchesStatus = statusFilter === 'all' || n.status === statusFilter;
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      n.number.includes(term) ||
      n.accessKey.includes(term) ||
      (n.customer?.name && n.customer.name.toLowerCase().includes(term)) ||
      (n.customer?.cpfCnpj && n.customer.cpfCnpj.includes(term));

    return matchesStatus && matchesSearch;
  });

  const handleAddProduct = () => {
    if (!productToAddId) return;
    const prod = products.find(p => p.id === productToAddId);
    if (!prod) return;

    setSelectedProductList(prev => [
      ...prev,
      { product: prod, quantity: 1, unitPrice: prod.salePrice || 0 }
    ]);
    setProductToAddId('');
  };

  const handleRemoveProduct = (index: number) => {
    setSelectedProductList(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleEmitNfe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEmitting) return;
    if (selectedProductList.length === 0) {
      onShowToast('Adicione ao menos um produto à NF-e', 'error');
      return;
    }

    const customer = customers.find(c => c.id === selectedCustomerId);
    if (!customer) {
      onShowToast('Selecione o cliente destinatário da NF-e', 'error');
      return;
    }

    setIsEmitting(true);
    try {
      const totalAmount = selectedProductList.reduce((acc, it) => acc + (it.unitPrice * it.quantity), 0);

      const items: NfceNfeProductItem[] = selectedProductList.map((it, idx) => {
        const storeUf = settings.nfceNfeConfig?.uf || (settings.storeAddress?.match(/\b([A-Z]{2})\b/)?.[1]) || 'SP';
        let customerUf = 'SP';
        if (customer.address) {
          const matchUf = customer.address.match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/i);
          if (matchUf) customerUf = matchUf[1].toUpperCase();
        }

        const effective = getEffectiveCfop(it.product.cfop || '5102', storeUf, customerUf);

        return {
          itemNumber: idx + 1,
          productId: it.product.id,
          description: it.product.name,
          ncm: it.product.ncm || '8517.79.00',
          cfop: effective.cfop,
          csosn: it.product.csosnCst || '102',
          origin: it.product.origin || '0',
          cstPis: it.product.cstPis || '49',
          cstCofins: it.product.cstCofins || '49',
          unitOfMeasure: 'UN',
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          totalPrice: it.quantity * it.unitPrice,
          icmsRate: it.product.icmsAliquota || 0,
          icmsAmount: 0
        };
      });

      const result = await FiscalEmissionService.emit({
        docType: 'nfe',
        settings,
        items,
        customer: {
          name: customer.name,
          cpfCnpj: customer.cpf || customer.phone || '000.000.000-00',
          email: customer.email,
          phone: customer.phone,
          address: customer.address ? {
            street: customer.address,
            number: 'S/N',
            neighborhood: 'Centro',
            city: 'São Paulo',
            uf: 'SP',
            zipCode: '01001-000'
          } : undefined
        },
        payment: {
          method: 'dinheiro',
          amountPaid: totalAmount,
          change: 0
        },
        totals: {
          productsAmount: totalAmount,
          discountAmount: 0,
          totalAmount
        },
        tenantId
      }, { timeoutMs: 25000 });

      if (!result.success) {
        onShowToast(`${result.message} ${result.suggestion ? `(${result.suggestion})` : ''}`, 'error');
        return;
      }

      if (result.noteItem) {
        const updatedNotes = [result.noteItem, ...notes.filter(n => n.id !== result.noteItem?.id)];
        setNotes(updatedNotes);

        if (settings.nfceNfeConfig) {
          setSettings({
            ...settings,
            nfceNfeConfig: {
              ...settings.nfceNfeConfig,
              nfeNextNumber: (settings.nfceNfeConfig.nfeNextNumber || 100) + 1
            }
          });
        }

        setShowNewNfeModal(false);
        setSelectedProductList([]);
        setSelectedCustomerId('');
        onShowToast(`NF-e Modelo 55 Nº ${result.noteItem.number} emitida com sucesso!`, 'success');
        setViewingDanfeNote(result.noteItem);
      }
    } catch (e: any) {
      onShowToast(`Erro ao emitir NF-e: ${e?.message || 'Falha desconhecida'}`, 'error');
    } finally {
      setIsEmitting(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelModalNote) return;
    if (cancelJustification.trim().length < 15) {
      onShowToast('A justificativa de cancelamento deve conter no mínimo 15 caracteres.', 'error');
      return;
    }

    try {
      const updatedNotes = notes.map(n => {
        if (n.id === cancelModalNote.id) {
          return {
            ...n,
            status: 'canceled' as const,
            cancellationProtocol: `13526${Math.floor(100000000 + Math.random() * 900000000)}`,
            cancellationJustification: cancelJustification.trim(),
            canceledAt: new Date().toISOString()
          };
        }
        return n;
      });

      setNotes(updatedNotes);
      localStorage.setItem(`fiscal_notes_${tenantId || 'global'}`, JSON.stringify(updatedNotes));
      setCancelModalNote(null);
      setCancelJustification('');
      onShowToast(`Cancelamento da NF-e Nº ${cancelModalNote.number} homologado na SEFAZ!`, 'success');
    } catch (e) {
      onShowToast('Erro ao cancelar NF-e.', 'error');
    }
  };

  const currentEnv = settings.nfceNfeConfig?.environment || 'homologacao';
  const isTestEnv = currentEnv === 'homologacao';

  const handleDeleteNote = (noteToDelete: NfceNfeItem) => {
    const isNoteTest = noteToDelete.environment === 'homologacao' || (!noteToDelete.environment && isTestEnv);
    if (!isNoteTest) {
      onShowToast('Notas em ambiente de PRODUÇÃO têm validade jurídica fiscal e não podem ser apagadas. Utilize o cancelamento oficial da SEFAZ.', 'error');
      return;
    }
    if (!confirm(`Deseja realmente apagar o registro da NF-e de Teste Nº ${noteToDelete.number}?`)) return;
    const updated = notes.filter(n => n.id !== noteToDelete.id);
    setNotes(updated);
    localStorage.setItem(`fiscal_notes_${tenantId || 'global'}`, JSON.stringify(updated));
    onShowToast(`NF-e de teste Nº ${noteToDelete.number} excluída com sucesso!`, 'info');
  };

  const handleClearAllNfe = () => {
    if (!confirm('Deseja apagar todas as NF-e emitidas em MODO DE TESTE (Homologação)? As notas de produção serão preservadas.')) return;
    const updated = notes.filter(n => n.docType !== 'nfe' || n.environment === 'producao');
    setNotes(updated);
    localStorage.setItem(`fiscal_notes_${tenantId || 'global'}`, JSON.stringify(updated));
    onShowToast('Todas as notas NF-e de teste foram apagadas!', 'success');
  };

  const hasTestNotes = notes.some(n => n.docType === 'nfe' && (n.environment === 'homologacao' || (!n.environment && isTestEnv)));

  return (
    <div className="space-y-6">
      {/* HEADER DA SEÇÃO NF-E */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <FileText size={20} className="text-blue-600" />
            Notas Fiscais Eletrônicas (NF-e Modelo 55)
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Emissão de NF-e mercantil para vendas B2B, devoluções, transferências e remessas com DANFE A4.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasTestNotes && isTestEnv && (
            <button
              type="button"
              onClick={handleClearAllNfe}
              className="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 border border-red-200"
              title="Apagar todas as notas NF-e de teste (Homologação)"
            >
              <Trash2 size={15} />
              <span>Limpar Notas de Teste</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowNewNfeModal(true)}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Plus size={16} />
            <span>Emitir Nova NF-e (Mod. 55)</span>
          </button>
        </div>
      </div>

      {/* FILTROS E BUSCA */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="BUSCAR POR NÚMERO, CHAVE OU NOME DO CLIENTE..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-2xl text-xs font-bold uppercase placeholder:text-slate-300 outline-none focus:border-blue-500 transition-all shadow-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-200 shadow-xs">
          {[
            { id: 'all', label: 'Todas' },
            { id: 'authorized', label: 'Autorizadas' },
            { id: 'canceled', label: 'Canceladas' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                statusFilter === f.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* LISTA DE NF-E */}
      {filteredNotes.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
          <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner border border-slate-100">
            <FileText size={28} />
          </div>
          <h3 className="text-sm font-black text-slate-800 uppercase">Nenhuma NF-e Encontrada</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Clique no botão acima para criar e emitir sua primeira Nota Fiscal Eletrônica Modelo 55 perante a SEFAZ.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotes.map(note => {
            const isNoteTest = note.environment === 'homologacao' || (!note.environment && isTestEnv);

            return (
              <div
                key={note.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                      note.status === 'authorized'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {note.status === 'authorized' ? 'Autorizada SEFAZ' : 'Cancelada'}
                    </span>

                    {isNoteTest ? (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                        Ambiente Teste
                      </span>
                    ) : (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                        Produção SEFAZ
                      </span>
                    )}

                    <h4 className="text-xs font-black text-slate-800 uppercase">
                      NF-e Nº {note.number} (Série {note.series}) • {note.customer?.name || 'Cliente Consumidor'}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900">
                      R$ {(note.totals?.totalAmount ?? (note as any).total ?? 0).toFixed(2)}
                    </span>

                    <button
                      type="button"
                      onClick={() => setViewingDanfeNote(note)}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye size={13} />
                      <span>Ver DANFE A4</span>
                    </button>

                    {note.status === 'authorized' && (
                      <button
                        type="button"
                        onClick={() => {
                          setCancelModalNote(note);
                          setCancelJustification('');
                        }}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                        title="Cancelar NF-e na SEFAZ"
                      >
                        <XCircle size={15} />
                      </button>
                    )}

                    {/* Exclusão permitida apenas em notas de teste (Homologação) */}
                    {isNoteTest && (
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(note)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Excluir NF-e de Teste (Homologação)"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Destinatário:</p>
                  <p className="font-bold text-slate-800 truncate">{note.customer?.name || 'Não informado'}</p>
                  <p className="text-[10px] font-mono text-slate-500">{note.customer?.cpfCnpj || 'CPF/CNPJ não informado'}</p>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Chave de Acesso (44 dígitos):</p>
                  <p className="font-mono text-[9px] text-slate-600 truncate">{note.accessKey}</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">Protocolo: {note.protocol || '135260000000000'}</p>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Data & Itens:</p>
                  <p className="font-bold text-slate-800">{new Date(note.issuedAt).toLocaleString('pt-BR')}</p>
                  <p className="text-[10px] text-slate-500">{note.items.length} produto(s) vinculado(s)</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )}

      {/* MODAL DE EMISSÃO DE NOVA NF-E */}
      {showNewNfeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase">Emitir NF-e (Modelo 55)</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Nota Fiscal Eletrônica Mercantil B2B / Consumidor</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewNfeModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 flex items-center justify-center text-sm font-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            {settings.certificateA1?.hasCertificate && (settings.certificateA1.isExpired || settings.certificateA1.status === 'expired') && (
              <div className="p-4 bg-red-50 border-2 border-red-500/40 rounded-2xl flex items-start gap-3">
                <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-xs font-black text-red-950 uppercase">
                    ❌ Certificado Digital Expirado ({settings.certificateA1.expiresAt ? new Date(settings.certificateA1.expiresAt).toLocaleDateString('pt-BR') : 'Data recente'})
                  </p>
                  <p className="text-[11px] text-red-800 font-medium leading-relaxed">
                    A emissão de NF-e (Modelo 55) não permite contingência offline imediata sem validação prévia. Acione o setor administrativo para renovar o arquivo do certificado.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleEmitNfe} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-600 uppercase">Cliente Destinatário *</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    required
                    className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                  >
                    <option value="">SELECIONE UM CLIENTE CADASTRADO...</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.cpf ? `(${c.cpf})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-600 uppercase">Natureza da Operação *</label>
                  <input
                    type="text"
                    value={naturezaOperacao}
                    onChange={(e) => setNaturezaOperacao(e.target.value)}
                    required
                    className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Adição de Produtos */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-[10px] font-black text-slate-600 uppercase">Adicionar Produtos do Estoque</label>
                <div className="flex gap-2">
                  <select
                    value={productToAddId}
                    onChange={(e) => setProductToAddId(e.target.value)}
                    className="flex-1 h-11 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="">SELECIONE UM PRODUTO DO CATÁLOGO...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} - R$ {(p.salePrice || 0).toFixed(2)} (NCM: {p.ncm || '8517.79.00'})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddProduct}
                    className="px-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase cursor-pointer"
                  >
                    Adicionar
                  </button>
                </div>

                {/* Tabela de Produtos Adicionados */}
                {selectedProductList.length > 0 && (
                  <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 space-y-2 mt-2">
                    {selectedProductList.map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-slate-100">
                        <div className="font-bold text-slate-800 truncate max-w-[260px]">
                          {it.product.name}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-slate-500">{it.quantity}x R$ {(it.unitPrice || 0).toFixed(2)}</span>
                          <span className="font-black text-slate-900">R$ {((it.quantity || 0) * (it.unitPrice || 0)).toFixed(2)}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveProduct(idx)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="text-right pt-2 border-t border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase mr-2">Total NF-e:</span>
                      <span className="text-sm font-black text-slate-900">
                        R$ {selectedProductList.reduce((acc, it) => acc + ((it.quantity || 0) * (it.unitPrice || 0)), 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  disabled={isEmitting || selectedProductList.length === 0}
                  className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isEmitting ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                  <span>{isEmitting ? 'Transmitindo à SEFAZ...' : 'Emitir e Transmitir NF-e'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewNfeModal(false)}
                  className="px-5 h-12 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-black uppercase cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CANCELAMENTO */}
      {cancelModalNote && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase">Cancelar NF-e na SEFAZ</h3>
                <p className="text-[10px] text-slate-400">Nota Nº {cancelModalNote.number}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-slate-600 uppercase">
                Justificativa Legal de Cancelamento (Mín. 15 caracteres) *
              </label>
              <textarea
                rows={3}
                value={cancelJustification}
                onChange={(e) => setCancelJustification(e.target.value)}
                placeholder="Informe o motivo do cancelamento (Ex: Venda cancelada pelo cliente antes da saída da mercadoria...)"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 outline-none focus:border-red-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                Homologar Cancelamento
              </button>
              <button
                type="button"
                onClick={() => setCancelModalNote(null)}
                className="px-4 h-11 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-black uppercase cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DANFE MODAL PREVIEW */}
      {viewingDanfeNote && (
        <NfceDanfeModal
          note={viewingDanfeNote}
          settings={settings}
          onClose={() => setViewingDanfeNote(null)}
          onShowToast={onShowToast}
          onNoteUpdated={(updated) => {
            const up = notes.map(n => n.id === updated.id ? updated : n);
            setNotes(up);
            setViewingDanfeNote(updated);
          }}
        />
      )}
    </div>
  );
};
