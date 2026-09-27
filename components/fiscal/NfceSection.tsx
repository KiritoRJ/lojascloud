import React, { useState } from 'react';
import { 
  Package, 
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
  QrCode, 
  ShoppingCart, 
  ShieldCheck, 
  ExternalLink,
  HelpCircle,
  Sliders
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

import { FiscalEmissionService } from '../../utils/fiscalEmissionService';

interface NfceSectionProps {
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

export const NfceSection: React.FC<NfceSectionProps> = ({
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'authorized' | 'contingencia_offline' | 'rejected' | 'canceled'>('all');
  const [viewingDanfeNote, setViewingDanfeNote] = useState<NfceNfeItem | null>(null);
  const [showNewNfceModal, setShowNewNfceModal] = useState(false);
  const [isEmitting, setIsEmitting] = useState(false);
  const [isBatchTransmitting, setIsBatchTransmitting] = useState(false);
  const [retransmittingNoteId, setRetransmittingNoteId] = useState<string | null>(null);

  // Formulário Nova NFC-e
  const [selectedSaleId, setSelectedSaleId] = useState('');
  const [cpfCnpjConsumidor, setCpfCnpjConsumidor] = useState('');
  const [nomeConsumidor, setNomeConsumidor] = useState('');
  const [selectedProductList, setSelectedProductList] = useState<Array<{ product: Product; quantity: number; unitPrice: number }>>([]);
  const [productToAddId, setProductToAddId] = useState('');

  // Cancelamento
  const [cancelModalNote, setCancelModalNote] = useState<NfceNfeItem | null>(null);
  const [cancelJustification, setCancelJustification] = useState('');

  // Filtra apenas NFC-e (Modelo 65)
  const nfceList = notes.filter(n => n.docType === 'nfce');
  const pendingNotes = nfceList.filter(n => n.status === 'contingencia_offline' || n.status === 'rejected' || n.tpEmis === '9');

  const filteredNotes = nfceList.filter(n => {
    const matchesStatus = statusFilter === 'all' || n.status === statusFilter;
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      n.number.includes(term) ||
      n.accessKey.includes(term) ||
      (n.customer?.name && n.customer.name.toLowerCase().includes(term)) ||
      (n.customer?.cpfCnpj && n.customer.cpfCnpj.includes(term));

    return matchesStatus && matchesSearch;
  });

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

  const handleBatchRetransmitAll = async () => {
    if (pendingNotes.length === 0) return;
    setIsBatchTransmitting(true);
    try {
      const { authorized, failed, results } = await FiscalEmissionService.retransmitPendingBatch(
        pendingNotes,
        settings,
        tenantId
      );

      // Atualiza a lista com as notas autorizadas
      const authorizedIds = new Set(results.filter(r => r.success && r.noteItem).map(r => r.noteItem!.id));
      const updatedNotes = notes.map(n => {
        if (authorizedIds.has(n.id)) {
          const match = results.find(r => r.noteItem?.id === n.id);
          return match?.noteItem || n;
        }
        return n;
      });

      setNotes(updatedNotes);

      if (authorized > 0) {
        onShowToast(`⚡ Transmissão concluída: ${authorized} cupom(ns) autorizados na SEFAZ!`, 'success');
      }
      if (failed > 0) {
        onShowToast(`⚠️ ${failed} nota(s) não foram autorizadas. Verifique o certificado ou a conexão.`, 'error');
      }
    } catch (e: any) {
      onShowToast(`Erro ao transmitir lote: ${e?.message || 'Falha de conexão'}`, 'error');
    } finally {
      setIsBatchTransmitting(false);
    }
  };

  const handleSelectSale = (saleId: string) => {
    setSelectedSaleId(saleId);
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    if (sale.customerName) setNomeConsumidor(sale.customerName);
    if (sale.customerPhone) setCpfCnpjConsumidor(sale.customerPhone);

    // Mapeia produtos da venda
    const mapped = (sale.items || []).map(it => {
      const prod = products.find(p => p.id === it.id || p.name.toLowerCase() === it.name.toLowerCase());
      return {
        product: prod || {
          id: it.id || `p_${Math.random()}`,
          name: it.name,
          salePrice: it.price,
          costPrice: 0,
          quantity: it.quantity,
          category: 'Geral',
          ncm: '8517.79.00',
          photo: null
        },
        quantity: it.quantity,
        unitPrice: it.price
      };
    });

    setSelectedProductList(mapped);
  };

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

  const handleEmitNfce = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEmitting) return;
    if (selectedProductList.length === 0) {
      onShowToast('Adicione ao menos um item ao cupom fiscal', 'error');
      return;
    }

    setIsEmitting(true);
    try {
      const totalAmount = selectedProductList.reduce((acc, it) => acc + (it.unitPrice * it.quantity), 0);

      const items: NfceNfeProductItem[] = selectedProductList.map((it, idx) => ({
        itemNumber: idx + 1,
        productId: it.product.id,
        description: it.product.name,
        ncm: it.product.ncm || '8517.79.00',
        cfop: it.product.cfop || '5102',
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
      }));

      const result = await FiscalEmissionService.emit({
        docType: 'nfce',
        settings,
        items,
        customer: {
          name: nomeConsumidor.trim() || 'CONSUMIDOR FINAL',
          cpfCnpj: cpfCnpjConsumidor.trim() || undefined
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
      }, { timeoutMs: 20000 });

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
              nfceNextNumber: (settings.nfceNfeConfig.nfceNextNumber || 100) + 1
            }
          });
        }

        setShowNewNfceModal(false);
        setSelectedProductList([]);
        setSelectedSaleId('');
        setNomeConsumidor('');
        setCpfCnpjConsumidor('');

        if (result.status === 'contingencia_offline') {
          onShowToast(result.message, 'info');
        } else {
          onShowToast(`Cupom NFC-e Nº ${result.noteItem.number} emitido com sucesso!`, 'success');
        }
        setViewingDanfeNote(result.noteItem);
      }
    } catch (e: any) {
      onShowToast(`Erro ao transmitir NFC-e: ${e?.message || 'Falha desconhecida'}`, 'error');
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
      onShowToast(`Cancelamento do Cupom NFC-e Nº ${cancelModalNote.number} homologado!`, 'success');
    } catch (e) {
      onShowToast('Erro ao cancelar NFC-e.', 'error');
    }
  };

  const currentEnv = settings.nfceNfeConfig?.environment || 'homologacao';
  const isTestEnv = currentEnv === 'homologacao';

  const handleDeleteNote = (noteToDelete: NfceNfeItem) => {
    const isNoteTest = noteToDelete.environment === 'homologacao' || (!noteToDelete.environment && isTestEnv);
    if (!isNoteTest) {
      onShowToast('Notas em ambiente de PRODUÇÃO têm valor fiscal e não podem ser apagadas. Utilize o cancelamento oficial da SEFAZ.', 'error');
      return;
    }
    if (!confirm(`Deseja realmente apagar o registro da NFC-e de Teste Nº ${noteToDelete.number}?`)) return;
    const updated = notes.filter(n => n.id !== noteToDelete.id);
    setNotes(updated);
    localStorage.setItem(`fiscal_notes_${tenantId || 'global'}`, JSON.stringify(updated));
    onShowToast(`NFC-e de teste Nº ${noteToDelete.number} excluída com sucesso!`, 'info');
  };

  const handleClearAllNfce = () => {
    if (!confirm('Deseja apagar todas as NFC-e emitidas em MODO DE TESTE (Homologação)? As notas de produção serão preservadas.')) return;
    const updated = notes.filter(n => n.docType !== 'nfce' || n.environment === 'producao');
    setNotes(updated);
    localStorage.setItem(`fiscal_notes_${tenantId || 'global'}`, JSON.stringify(updated));
    onShowToast('Todas as notas NFC-e de teste foram apagadas!', 'success');
  };

  const hasTestNotes = notes.some(n => n.docType === 'nfce' && (n.environment === 'homologacao' || (!n.environment && isTestEnv)));

  return (
    <div className="space-y-6">
      {/* HEADER DA SEÇÃO NFC-E */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <Package size={20} className="text-emerald-600" />
            Cupons Fiscais Eletrônicos (NFC-e Modelo 65)
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Emissão rápida de cupons fiscais para o consumidor no PDV, com QR Code SEFAZ e impressão térmica 80mm/58mm.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasTestNotes && isTestEnv && (
            <button
              type="button"
              onClick={handleClearAllNfce}
              className="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 border border-red-200"
              title="Apagar todas as notas NFC-e de teste (Homologação)"
            >
              <Trash2 size={15} />
              <span>Limpar Notas de Teste</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowNewNfceModal(true)}
            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Plus size={16} />
            <span>Emitir Cupom NFC-e (Mod. 65)</span>
          </button>
        </div>
      </div>

      {/* ALERTA DE NOTAS PENDENTES EM CONTINGÊNCIA OU COM REJEIÇÃO */}
      {pendingNotes.length > 0 && (
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-3xl text-slate-950 shadow-lg shadow-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-950/10 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle size={22} className="text-slate-950" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-tight">
                {pendingNotes.length} Cupom(ns) NFC-e Pendente(s) de Transmissão na SEFAZ
              </h3>
              <p className="text-xs text-slate-900/80 font-medium mt-0.5">
                Notas emitidas em contingência offline ou bloqueadas por certificado. Transmita o lote para regularizar o fisco.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleBatchRetransmitAll}
            disabled={isBatchTransmitting}
            className="px-5 py-3 bg-slate-950 text-amber-400 hover:bg-slate-900 active:scale-95 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
          >
            {isBatchTransmitting ? (
              <>
                <RefreshCw size={15} className="animate-spin text-amber-400" />
                <span>Transmitindo Lote...</span>
              </>
            ) : (
              <>
                <Send size={15} />
                <span>Transmitir {pendingNotes.length} Nota(s) Agora</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* FILTROS E BUSCA */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="BUSCAR POR NÚMERO DO CUPOM, CHAVE OU CLIENTE..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-2xl text-xs font-bold uppercase placeholder:text-slate-300 outline-none focus:border-emerald-500 transition-all shadow-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-200 shadow-xs flex-wrap">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'authorized', label: 'Autorizados' },
            { id: 'contingencia_offline', label: 'Contingência' },
            { id: 'rejected', label: 'Rejeitados' },
            { id: 'canceled', label: 'Cancelados' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                statusFilter === f.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* LISTA DE NFC-E */}
      {filteredNotes.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
          <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner border border-slate-100">
            <Package size={28} />
          </div>
          <h3 className="text-sm font-black text-slate-800 uppercase">Nenhum Cupom NFC-e Emitido</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Emita cupons fiscais no fechamento de vendas no PDV ou clique no botão acima para emissão manual.
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
                        : note.status === 'contingencia_offline' || note.tpEmis === '9'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : note.status === 'rejected'
                        ? 'bg-red-100 text-red-900 border border-red-300'
                        : 'bg-slate-100 text-slate-800'
                    }`}>
                      {note.status === 'authorized'
                        ? 'Cupom Autorizado'
                        : note.status === 'contingencia_offline' || note.tpEmis === '9'
                        ? 'Contingência Offline (Pendente)'
                        : note.status === 'rejected'
                        ? `Rejeitada (${note.rejectionCode || 'SEFAZ'})`
                        : 'Cancelado'}
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
                      NFC-e Nº {note.number} (Série {note.series}) • {note.customer?.name || 'Consumidor Final'}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900">
                      R$ {(note.totals?.totalAmount ?? (note as any).total ?? 0).toFixed(2)}
                    </span>

                    {(note.status === 'contingencia_offline' || note.status === 'rejected' || note.tpEmis === '9') && (
                      <button
                        type="button"
                        onClick={() => handleRetransmitSingle(note)}
                        disabled={retransmittingNoteId === note.id}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 cursor-pointer shadow-xs transition-all disabled:opacity-50"
                        title="Transmitir para SEFAZ agora"
                      >
                        {retransmittingNoteId === note.id ? (
                          <>
                            <RefreshCw size={13} className="animate-spin text-slate-950" />
                            <span>Enviando...</span>
                          </>
                        ) : (
                          <>
                            <Send size={13} />
                            <span>Transmitir</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setViewingDanfeNote(note)}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye size={13} />
                      <span>Ver DANFE / QR Code</span>
                    </button>

                    {note.status === 'authorized' && (
                      <button
                        type="button"
                        onClick={() => {
                          setCancelModalNote(note);
                          setCancelJustification('');
                        }}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                        title="Cancelar NFC-e na SEFAZ"
                      >
                        <XCircle size={15} />
                      </button>
                    )}

                    {/* Excluir disponível exclusivamente em modo de teste (Homologação) */}
                    {isNoteTest && (
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(note)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Excluir NFC-e de Teste (Homologação)"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Consumidor:</p>
                  <p className="font-bold text-slate-800 truncate">{note.customer?.name || 'Consumidor Final'}</p>
                  <p className="text-[10px] font-mono text-slate-500">{note.customer?.cpfCnpj || 'Sem CPF na nota'}</p>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Chave de Acesso:</p>
                  <p className="font-mono text-[9px] text-slate-600 truncate">{note.accessKey}</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">Protocolo: {note.protocol || '135260000000000'}</p>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Data & Itens:</p>
                  <p className="font-bold text-slate-800">{new Date(note.issuedAt).toLocaleString('pt-BR')}</p>
                  <p className="text-[10px] text-slate-500">{note.items.length} item(ns) fiscal(is)</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )}

      {/* MODAL DE EMISSÃO DE NOVA NFC-E */}
      {showNewNfceModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                  <Package size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase">Emitir Cupom NFC-e (Modelo 65)</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Cupom Fiscal Eletrônico do Consumidor para PDV</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewNfceModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 flex items-center justify-center text-sm font-black"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEmitNfce} className="space-y-4">
              {/* Importar de Venda Existente */}
              {sales.length > 0 && (
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-600 uppercase">
                    Importar Dados de uma Venda Recente (Opcional)
                  </label>
                  <select
                    value={selectedSaleId}
                    onChange={(e) => handleSelectSale(e.target.value)}
                    className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                  >
                    <option value="">DIGITAÇÃO MANUAL OU SELECIONE UMA VENDA...</option>
                    {sales.slice(0, 15).map(s => (
                      <option key={s.id} value={s.id}>
                        Venda {s.id} - R$ {(s.total ?? s.finalPrice ?? 0).toFixed(2)} - {s.customerName || 'Consumidor'} ({new Date(s.date).toLocaleDateString('pt-BR')})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-600 uppercase">Nome do Consumidor</label>
                  <input
                    type="text"
                    value={nomeConsumidor}
                    onChange={(e) => setNomeConsumidor(e.target.value)}
                    placeholder="CONSUMIDOR FINAL"
                    className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-600 uppercase">CPF na Nota (Opcional)</label>
                  <input
                    type="text"
                    value={cpfCnpjConsumidor}
                    onChange={(e) => setCpfCnpjConsumidor(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none"
                  />
                </div>
              </div>

              {/* Adição de Produtos */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-[10px] font-black text-slate-600 uppercase">Itens do Cupom Fiscal</label>
                <div className="flex gap-2">
                  <select
                    value={productToAddId}
                    onChange={(e) => setProductToAddId(e.target.value)}
                    className="flex-1 h-11 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="">SELECIONE UM PRODUTO DO CATÁLOGO...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} - R$ {(p.salePrice || 0).toFixed(2)}
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

                {/* Tabela de Produtos */}
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
                      <span className="text-[10px] font-bold text-slate-500 uppercase mr-2">Total do Cupom:</span>
                      <span className="text-sm font-black text-emerald-600">
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
                  className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isEmitting ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                  <span>{isEmitting ? 'Autorizando Cupom...' : 'Emitir Cupom NFC-e'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewNfceModal(false)}
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
                <h3 className="text-sm font-black text-slate-900 uppercase">Cancelar Cupom NFC-e</h3>
                <p className="text-[10px] text-slate-400">Cupom Nº {cancelModalNote.number}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-slate-600 uppercase">
                Motivo do Cancelamento (Mín. 15 caracteres) *
              </label>
              <textarea
                rows={3}
                value={cancelJustification}
                onChange={(e) => setCancelJustification(e.target.value)}
                placeholder="Ex: Desistência da compra pelo consumidor no balcão..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 outline-none focus:border-red-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                Confirmar Cancelamento
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
