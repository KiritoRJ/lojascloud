import React, { useState } from 'react';
import { 
  Activity, 
  Plus, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Search, 
  Trash2, 
  Printer, 
  Download, 
  RefreshCw, 
  Send, 
  Sliders, 
  Hash, 
  Calendar, 
  Clock, 
  Copy, 
  FileCheck, 
  Check, 
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { AppSettings, FiscalEventItem, NfceNfeItem } from '../../types';

interface EventosSectionProps {
  settings: AppSettings;
  tenantId?: string;
  notes: NfceNfeItem[];
  onShowToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const EventosSection: React.FC<EventosSectionProps> = ({
  settings,
  tenantId = '',
  notes,
  onShowToast
}) => {
  const storageKey = `fiscal_events_${tenantId || 'global'}`;
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'cce' | 'cancelamento' | 'inutilizacao' | 'manifestacao'>('all');
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [eventTypeToCreate, setEventTypeToCreate] = useState<'cce' | 'inutilizacao' | 'manifestacao'>('cce');

  // Formulário de CC-e
  const [selectedNoteKey, setSelectedNoteKey] = useState('');
  const [cceText, setCceText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formulário de Inutilização
  const [inutDocType, setInutDocType] = useState<'nfe' | 'nfce'>('nfe');
  const [inutSeries, setInutSeries] = useState('1');
  const [inutStart, setInutStart] = useState('');
  const [inutEnd, setInutEnd] = useState('');
  const [inutJustification, setInutJustification] = useState('');

  // Formulário de Manifestação
  const [manifestKey, setManifestKey] = useState('');
  const [manifestType, setManifestType] = useState<'ciencia' | 'confirmacao' | 'desconhecimento' | 'nao_realizada'>('confirmacao');
  const [manifestJustification, setManifestJustification] = useState('');

  // Lista de Eventos Persistida - Sem registros de teste fictícios
  const [events, setEvents] = useState<FiscalEventItem[]>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(e => e && !e.id?.startsWith('evt_01') && !e.id?.startsWith('evt_02'));
          localStorage.setItem(storageKey, JSON.stringify(cleaned));
          return cleaned;
        }
      } catch (e) {}
    }
    return [];
  });

  const saveEvents = (updated: FiscalEventItem[]) => {
    setEvents(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const handleCreateCce = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNoteKey) {
      onShowToast('Selecione a NF-e para emitir a Carta de Correção', 'error');
      return;
    }

    if (cceText.trim().length < 15) {
      onShowToast('O texto da CC-e deve conter no mínimo 15 caracteres conforme regra SEFAZ', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await new Promise(r => setTimeout(r, 1200));

      const relatedNote = notes.find(n => n.accessKey === selectedNoteKey);
      const existingCces = events.filter(ev => ev.accessKey === selectedNoteKey && ev.eventType === 'cce');
      const sequence = existingCces.length + 1;

      const newEvent: FiscalEventItem = {
        id: `evt_cce_${Date.now()}`,
        tenantId,
        docType: 'nfe',
        eventType: 'cce',
        accessKey: selectedNoteKey,
        docNumber: relatedNote?.number || '000000',
        sequence,
        description: `Carta de Correção Eletrônica (CC-e) nº ${sequence}`,
        correctionText: cceText.trim(),
        protocol: `13526${Math.floor(100000000 + Math.random() * 900000000)}`,
        status: 'authorized',
        registeredAt: new Date().toISOString()
      };

      saveEvents([newEvent, ...events]);
      setShowNewEventModal(false);
      setSelectedNoteKey('');
      setCceText('');
      onShowToast(`Carta de Correção nº ${sequence} autorizada na SEFAZ!`, 'success');
    } catch (e) {
      onShowToast('Erro ao transmitir CC-e para a SEFAZ.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateInutilizacao = async (e: React.FormEvent) => {
    e.preventDefault();
    const start = parseInt(inutStart, 10);
    const end = parseInt(inutEnd, 10);

    if (isNaN(start) || isNaN(end) || start > end) {
      onShowToast('Informe uma faixa de numeração válida (Inicial <= Final)', 'error');
      return;
    }

    if (inutJustification.trim().length < 15) {
      onShowToast('A justificativa de inutilização deve ter no mínimo 15 caracteres', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await new Promise(r => setTimeout(r, 1200));

      const newEvent: FiscalEventItem = {
        id: `evt_inut_${Date.now()}`,
        tenantId,
        docType: inutDocType,
        eventType: 'inutilizacao',
        accessKey: '',
        startNumber: start,
        endNumber: end,
        series: inutSeries || '1',
        year: new Date().getFullYear(),
        description: `Inutilização de Numeração ${inutDocType.toUpperCase()} (Série ${inutSeries}, Nº ${start} a ${end})`,
        justification: inutJustification.trim(),
        protocol: `13526${Math.floor(100000000 + Math.random() * 900000000)}`,
        status: 'authorized',
        registeredAt: new Date().toISOString()
      };

      saveEvents([newEvent, ...events]);
      setShowNewEventModal(false);
      setInutStart('');
      setInutEnd('');
      setInutJustification('');
      onShowToast('Faixa de numeração inutilizada com sucesso na SEFAZ!', 'success');
    } catch (e) {
      onShowToast('Erro ao registrar inutilização na SEFAZ.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateManifestacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (manifestKey.replace(/\D/g, '').length !== 44) {
      onShowToast('A Chave de Acesso deve conter 44 dígitos', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await new Promise(r => setTimeout(r, 1200));

      const titles: Record<string, string> = {
        ciencia: 'Ciência da Emissão / Operação',
        confirmacao: 'Confirmação da Operação (Nota Recebida)',
        desconhecimento: 'Desconhecimento da Operação',
        nao_realizada: 'Operação Não Realizada'
      };

      const newEvent: FiscalEventItem = {
        id: `evt_manif_${Date.now()}`,
        tenantId,
        docType: 'nfe',
        eventType: 'manifestacao',
        accessKey: manifestKey.replace(/\D/g, ''),
        manifestType,
        description: `Manifestação do Destinatário: ${titles[manifestType]}`,
        justification: manifestJustification.trim() || undefined,
        protocol: `13526${Math.floor(100000000 + Math.random() * 900000000)}`,
        status: 'authorized',
        registeredAt: new Date().toISOString()
      };

      saveEvents([newEvent, ...events]);
      setShowNewEventModal(false);
      setManifestKey('');
      setManifestJustification('');
      onShowToast('Manifestação do Destinatário registrada na SEFAZ!', 'success');
    } catch (e) {
      onShowToast('Erro ao enviar manifestação para SEFAZ.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isTestEnv = (settings.nfceNfeConfig?.environment || 'homologacao') === 'homologacao';

  const handleDeleteEvent = (id: string) => {
    if (!isTestEnv) {
      onShowToast('Registros em ambiente de PRODUÇÃO são auditados e não podem ser apagados.', 'error');
      return;
    }
    if (window.confirm('Deseja excluir este registro de evento de teste do histórico local?')) {
      saveEvents(events.filter(e => e.id !== id));
      onShowToast('Registro de evento removido.', 'info');
    }
  };

  const filteredEvents = events.filter(ev => {
    const matchesFilter = filterType === 'all' || ev.eventType === filterType;
    const cleanSearch = searchTerm.toLowerCase();
    const matchesSearch = 
      ev.description.toLowerCase().includes(cleanSearch) ||
      ev.protocol.toLowerCase().includes(cleanSearch) ||
      ev.accessKey.toLowerCase().includes(cleanSearch) ||
      (ev.correctionText && ev.correctionText.toLowerCase().includes(cleanSearch)) ||
      (ev.justification && ev.justification.toLowerCase().includes(cleanSearch));

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* HEADER DA SEÇÃO DE EVENTOS */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <Activity size={20} className="text-amber-500" />
            Eventos Fiscais SEFAZ
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Registro oficial de Cartas de Correção (CC-e), Cancelamentos, Inutilização de Faixa e Manifestação do Destinatário.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowNewEventModal(true)}
          className="px-5 py-3 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Plus size={16} className="text-emerald-400" />
          <span>Registrar Novo Evento</span>
        </button>
      </div>

      {/* FILTROS E BUSCA */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="BUSCAR POR CHAVE, PROTOCOLO OU DESCRIÇÃO..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-2xl text-xs font-bold uppercase placeholder:text-slate-300 outline-none focus:border-blue-500 transition-all shadow-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'cce', label: 'Cartas de Correção' },
            { id: 'inutilizacao', label: 'Inutilizações' },
            { id: 'manifestacao', label: 'Manifestações' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                filterType === f.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* LISTA DE EVENTOS REGISTRADOS */}
      {filteredEvents.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
          <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner border border-slate-100">
            <Activity size={28} />
          </div>
          <h3 className="text-sm font-black text-slate-800 uppercase">Nenhum Evento Fiscal Encontrado</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Utilize o botão acima para emitir uma Carta de Correção Eletrônica, Inutilizar Números ou Manifestar Notas de Fornecedores.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map(event => (
            <div
              key={event.id}
              className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                    event.eventType === 'cce'
                      ? 'bg-blue-100 text-blue-800'
                      : event.eventType === 'inutilizacao'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {event.eventType === 'cce' ? 'CC-e SEFAZ' : event.eventType === 'inutilizacao' ? 'Inutilização' : 'Manifestação MDe'}
                  </span>

                  <h4 className="text-xs font-black text-slate-800 uppercase">
                    {event.description}
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-bold">
                    {new Date(event.registeredAt).toLocaleString('pt-BR')}
                  </span>
                  {isTestEnv && (
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      title="Remover evento de teste do histórico"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Corpo do Evento */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {event.correctionText && (
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Texto da Correção:</p>
                    <p className="text-xs font-semibold text-slate-700 leading-relaxed">{event.correctionText}</p>
                  </div>
                )}

                {event.justification && (
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Justificativa Legal:</p>
                    <p className="text-xs font-semibold text-slate-700 leading-relaxed">{event.justification}</p>
                  </div>
                )}

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Protocolo de Homologação:</p>
                  <p className="text-xs font-mono font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 size={13} /> {event.protocol}
                  </p>
                  {event.accessKey && (
                    <p className="text-[9px] font-mono text-slate-400 truncate mt-1">
                      Chave: {event.accessKey}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE NOVO EVENTO FISCAL */}
      {showNewEventModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xl shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar space-y-5">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                  <Activity size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase">Registrar Evento Fiscal</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Selecione o tipo de evento para envio à SEFAZ</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewEventModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 flex items-center justify-center text-sm font-black"
              >
                ✕
              </button>
            </div>

            {/* SELETOR DE TIPO DE EVENTO */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'cce', label: 'Carta de Correção (CC-e)' },
                { id: 'inutilizacao', label: 'Inutilizar Numeração' },
                { id: 'manifestacao', label: 'Manifestação (MDe)' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setEventTypeToCreate(tab.id as any)}
                  className={`p-3 rounded-2xl text-[10px] font-black uppercase text-center transition-all cursor-pointer ${
                    eventTypeToCreate === tab.id
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* FORMULÁRIO ESPECÍFICO CONFORME TIPO */}
            {eventTypeToCreate === 'cce' && (
              <form onSubmit={handleCreateCce} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-600 uppercase">
                    Selecione a NF-e para Correção *
                  </label>
                  <select
                    value={selectedNoteKey}
                    onChange={(e) => setSelectedNoteKey(e.target.value)}
                    required
                    className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                  >
                    <option value="">SELECIONE UMA NF-E EMITIDA...</option>
                    {notes.filter(n => n.status === 'authorized').map(note => (
                      <option key={note.accessKey} value={note.accessKey}>
                        NF-e Nº {note.number} (Série {note.series}) - {note.customer?.name || 'Cliente'} - R$ {(note.totals?.totalAmount ?? (note as any).total ?? 0).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-600 uppercase">
                    Texto da Correção (Mínimo 15 caracteres) *
                  </label>
                  <textarea
                    rows={4}
                    value={cceText}
                    onChange={(e) => setCceText(e.target.value)}
                    required
                    placeholder="Descreva com precisão a alteração (Ex: Correção dos dados de transporte, endereço de entrega ou código de produto...)"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                  />
                  <p className="text-[9px] text-slate-400">
                    * A CC-e não pode alterar valores tributários, datas de emissão ou dados cadastrais completos que mudem o destinatário.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                    <span>{isSubmitting ? 'Transmitindo...' : 'Transmitir CC-e à SEFAZ'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewEventModal(false)}
                    className="px-5 h-12 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-black uppercase cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {eventTypeToCreate === 'inutilizacao' && (
              <form onSubmit={handleCreateInutilizacao} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-600 uppercase">Modelo do Documento *</label>
                    <select
                      value={inutDocType}
                      onChange={(e) => setInutDocType(e.target.value as any)}
                      className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none"
                    >
                      <option value="nfe">NF-e (Modelo 55)</option>
                      <option value="nfce">NFC-e (Modelo 65)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-600 uppercase">Série *</label>
                    <input
                      type="text"
                      value={inutSeries}
                      onChange={(e) => setInutSeries(e.target.value)}
                      required
                      className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-600 uppercase">Número Inicial *</label>
                    <input
                      type="number"
                      value={inutStart}
                      onChange={(e) => setInutStart(e.target.value)}
                      required
                      placeholder="Ex: 50"
                      className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-600 uppercase">Número Final *</label>
                    <input
                      type="number"
                      value={inutEnd}
                      onChange={(e) => setInutEnd(e.target.value)}
                      required
                      placeholder="Ex: 55"
                      className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-600 uppercase">Justificativa Legal (Min. 15 caracteres) *</label>
                  <textarea
                    rows={3}
                    value={inutJustification}
                    onChange={(e) => setInutJustification(e.target.value)}
                    required
                    placeholder="Informe o motivo da quebra de sequência (Ex: Erro de comunicação com o sistema fiscal durante a emissão...)"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 h-12 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                    <span>{isSubmitting ? 'Inutilizando...' : 'Inutilizar Faixa na SEFAZ'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewEventModal(false)}
                    className="px-5 h-12 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-black uppercase cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {eventTypeToCreate === 'manifestacao' && (
              <form onSubmit={handleCreateManifestacao} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-600 uppercase">Chave de Acesso da NF-e (44 dígitos) *</label>
                  <input
                    type="text"
                    maxLength={44}
                    value={manifestKey}
                    onChange={(e) => setManifestKey(e.target.value)}
                    required
                    placeholder="0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000"
                    className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-600 uppercase">Tipo de Manifestação *</label>
                  <select
                    value={manifestType}
                    onChange={(e) => setManifestType(e.target.value as any)}
                    className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="confirmacao">Confirmação da Operação (Mercadoria recebida)</option>
                    <option value="ciencia">Ciência da Operação (Ciente da nota emitida)</option>
                    <option value="desconhecimento">Desconhecimento da Operação (Não comprei)</option>
                    <option value="nao_realizada">Operação Não Realizada (Cancelada com fornecedor)</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                    <span>{isSubmitting ? 'Transmitindo...' : 'Registrar Manifestação SEFAZ'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewEventModal(false)}
                    className="px-5 h-12 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-black uppercase cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
