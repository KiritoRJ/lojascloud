import React, { useState } from 'react';
import { BookOpen, ShieldCheck, FileCheck, HelpCircle, AlertTriangle, ArrowRight, CheckCircle2, ChevronDown, ChevronUp, Sparkles, Scale, Info, Layers } from 'lucide-react';

export const NfceFiscalGuide: React.FC = () => {
  const [activeAccordion, setActiveAccordion] = useState<string | null>('modelos');

  const toggleAccordion = (id: string) => {
    setActiveAccordion(prev => prev === id ? null : id);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header do Guia */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center border border-blue-400/30">
              <Scale size={20} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-300">
              Legislação Tributária & Normas SEFAZ Brasil
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
            Guia Completo de NFC-e & NF-e para Vendas no Varejo
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Manual prático para assistência técnica e lojas de acessórios eletrônicos, cobrindo regras da SEFAZ,
            tabelas de NCM, CFOPs, regimes do Simples Nacional e cumprimento rigoroso das leis fiscais brasileiras.
          </p>
        </div>
      </div>

      {/* Accordions Temáticos */}
      <div className="space-y-4">
        {/* 1. Diferença entre NFC-e, NF-e e NFS-e */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => toggleAccordion('modelos')}
            className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Layers size={20} />
              </div>
              <div>
                <h3 className="font-black text-sm uppercase text-slate-900 tracking-tight">
                  1. Qual a diferença entre NFC-e (Mod. 65), NF-e (Mod. 55) e NFS-e?
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Entenda quando emitir cada documento fiscal na sua assistência ou comércio
                </p>
              </div>
            </div>
            {activeAccordion === 'modelos' ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
          </button>

          {activeAccordion === 'modelos' && (
            <div className="px-6 pb-6 pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-emerald-50/70 border border-emerald-200/60 rounded-2xl space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded-md inline-block">
                    NFC-e • Modelo 65
                  </span>
                  <h4 className="font-black text-slate-900 text-xs">Venda no Balcão / Consumidor Final</h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Substitui o antigo cupom fiscal (ECF). Usada para venda presencial de capinhas, cabos, películas, peças e celulares para pessoa física ou consumidor final no balcão.
                  </p>
                  <p className="text-[10px] font-bold text-emerald-800">Órgão: SEFAZ Estadual | Impresso: Cupom DANFE com QR Code</p>
                </div>

                <div className="p-4 bg-blue-50/70 border border-blue-200/60 rounded-2xl space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded-md inline-block">
                    NF-e • Modelo 55
                  </span>
                  <h4 className="font-black text-slate-900 text-xs">Vendas Grandes, PJ, Devoluções & E-commerce</h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Nota completa tradicional em folha A4. Obrigatória para vendas interestaduais, vendas para empresas com Inscrição Estadual (PJ), devoluções de mercadoria, remessa para conserto e garantia.
                  </p>
                  <p className="text-[10px] font-bold text-blue-800">Órgão: SEFAZ Estadual | Impresso: DANFE A4 com Chave de 44 Dígitos</p>
                </div>

                <div className="p-4 bg-purple-50/70 border border-purple-200/60 rounded-2xl space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-wider bg-purple-600 text-white px-2 py-0.5 rounded-md inline-block">
                    NFS-e • Serviços
                  </span>
                  <h4 className="font-black text-slate-900 text-xs">Mão de Obra de Reparo & Manutenção</h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Exclusiva para a prestação de serviços (troca de tela, desoxidação, reparo de placa). Tributada pelo ISS Municipal (Lei Complementar 116/2003).
                  </p>
                  <p className="text-[10px] font-bold text-purple-800">Órgão: Prefeitura Municipal | Impresso: DANFSE</p>
                </div>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 flex items-start gap-2.5">
                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Atenção na Venda Mista (Peça + Mão de Obra):</strong> Se a sua loja cobra pela peça física e pelo serviço separadamente, a peça deve ter NFC-e/NF-e (SEFAZ) e o serviço deve ter NFS-e (Prefeitura), exceto se enquadrado em fornecimento acessório de peças na O.S. conforme jurisprudência do seu município.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. Tabela de NCMs de Eletrônicos */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => toggleAccordion('ncm')}
            className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <BookOpen size={20} />
              </div>
              <div>
                <h3 className="font-black text-sm uppercase text-slate-900 tracking-tight">
                  2. Tabela de NCMs Mais Utilizados (Assistência & Varejo)
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Códigos NCM válidos de 8 dígitos para produtos e acessórios
                </p>
              </div>
            </div>
            {activeAccordion === 'ncm' ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
          </button>

          {activeAccordion === 'ncm' && (
            <div className="px-6 pb-6 pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-4">
              <p className="text-xs text-slate-500">
                O NCM (Nomenclatura Comum do Mercosul) possui exatamente <strong>8 dígitos numéricos</strong> e é obrigatório em todo item emitido na NFC-e/NF-e. Informar NCM incorreto gera <strong>Rejeição 778</strong>.
              </p>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3">NCM (8 Dígitos)</th>
                      <th className="p-3">Descrição do Produto</th>
                      <th className="p-3">CEST Típico</th>
                      <th className="p-3">Regime ICMS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    <tr className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono font-bold text-blue-600">8517.13.00</td>
                      <td className="p-3">Smartphones / Telefones celulares para redes celulares</td>
                      <td className="p-3 font-mono text-slate-500">21.053.00</td>
                      <td className="p-3"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-bold text-[10px]">Tributado / ST</span></td>
                    </tr>
                    <tr className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono font-bold text-blue-600">8517.79.00</td>
                      <td className="p-3">Partes e peças de celulares (Telas, displays, flats, carcaças)</td>
                      <td className="p-3 font-mono text-slate-500">21.054.00</td>
                      <td className="p-3"><span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md font-bold text-[10px]">Tributado</span></td>
                    </tr>
                    <tr className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono font-bold text-blue-600">8504.40.10</td>
                      <td className="p-3">Carregadores de bateria, adaptadores e fontes de celular</td>
                      <td className="p-3 font-mono text-slate-500">21.008.00</td>
                      <td className="p-3"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-bold text-[10px]">ST / Monofásico</span></td>
                    </tr>
                    <tr className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono font-bold text-blue-600">8518.30.00</td>
                      <td className="p-3">Fones de ouvido com ou sem microfone, fones Bluetooth</td>
                      <td className="p-3 font-mono text-slate-500">21.057.00</td>
                      <td className="p-3"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-bold text-[10px]">ST</span></td>
                    </tr>
                    <tr className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono font-bold text-blue-600">3926.90.90</td>
                      <td className="p-3">Capas de proteção de silicone, TPU ou plástico</td>
                      <td className="p-3 font-mono text-slate-500">-</td>
                      <td className="p-3"><span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md font-bold text-[10px]">Tributado</span></td>
                    </tr>
                    <tr className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono font-bold text-blue-600">7007.19.00</td>
                      <td className="p-3">Películas de vidro temperado de proteção</td>
                      <td className="p-3 font-mono text-slate-500">-</td>
                      <td className="p-3"><span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md font-bold text-[10px]">Tributado</span></td>
                    </tr>
                    <tr className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono font-bold text-blue-600">8523.51.10</td>
                      <td className="p-3">Cartões de memória MicroSD, Pen Drives e memórias flash</td>
                      <td className="p-3 font-mono text-slate-500">21.066.00</td>
                      <td className="p-3"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-bold text-[10px]">ST</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* 3. Tabela de CFOPs */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => toggleAccordion('cfop')}
            className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <FileCheck size={20} />
              </div>
              <div>
                <h3 className="font-black text-sm uppercase text-slate-900 tracking-tight">
                  3. CFOPs de Venda e Operações (Código Fiscal de Operações)
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Qual código de 4 dígitos usar em cada situação
                </p>
              </div>
            </div>
            {activeAccordion === 'cfop' ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
          </button>

          {activeAccordion === 'cfop' && (
            <div className="px-6 pb-6 pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-sm text-blue-600">5.102</span>
                    <span className="text-[9px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md uppercase">Dentro do Estado</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs">Venda de mercadoria adquirida de terceiros</h4>
                  <p className="text-[11px] text-slate-500">Utilize este CFOP na maioria das vendas comuns de balcão (NFC-e) quando o ICMS for tributado normalmente no Simples.</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-sm text-emerald-600">5.405</span>
                    <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md uppercase">Substituição Tributária</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs">Venda de mercadoria com ICMS retido por ST</h4>
                  <p className="text-[11px] text-slate-500">Para produtos onde o ICMS já foi recolhido pelo fabricante/distribuidor na compra (ex: fones e carregadores com ST).</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-sm text-purple-600">6.102</span>
                    <span className="text-[9px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md uppercase">Interestadual</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs">Venda para outro Estado (NF-e Mod. 55)</h4>
                  <p className="text-[11px] text-slate-500">Para vendas online ou envios para clientes fora do seu estado de registro.</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-sm text-amber-600">5.915 / 5.916</span>
                    <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md uppercase">Conserto / Garantia</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs">Remessa / Retorno de Conserto</h4>
                  <p className="text-[11px] text-slate-500">Para transportar aparelhos de clientes para centros de reparo externos sem incidência de impostos.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. Como Obter e Configurar o CSC (Código de Segurança do Contribuinte) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => toggleAccordion('csc')}
            className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="font-black text-sm uppercase text-slate-900 tracking-tight">
                  4. Como gerar o Código CSC / Token na SEFAZ do seu Estado
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Passo a passo para gerar o IdToken e Código CSC obrigatório para o QR Code da NFC-e
                </p>
              </div>
            </div>
            {activeAccordion === 'csc' ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
          </button>

          {activeAccordion === 'csc' && (
            <div className="px-6 pb-6 pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                O <strong>CSC (Código de Segurança do Contribuinte)</strong> é um código alfanumérico fornecido exclusivamente pela SEFAZ estadual para garantir a autenticidade do <strong>QR Code impresso no cupom da NFC-e</strong>. Sem ele, a emissão resulta em <strong>Rejeição 462 ou 463</strong>.
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">1</span>
                  <div>
                    <h5 className="font-black text-slate-800 text-xs uppercase">Acesse o Portal da SEFAZ da sua UF</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">Entre no portal da Secretaria da Fazenda do seu estado (ex: SEFAZ-SP, SEFAZ-RJ, SEFAZ-MG) na área restrita do contribuinte ou no Posto Fiscal Eletrônico.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">2</span>
                  <div>
                    <h5 className="font-black text-slate-800 text-xs uppercase">Faça Login com seu Certificado Digital A1</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">Autentique com o certificado e-CNPJ da sua empresa ou com o login do contador credenciado.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">3</span>
                  <div>
                    <h5 className="font-black text-slate-800 text-xs uppercase">Solicite o Código CSC / Token NFC-e</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">Navegue até o menu <em>"NFC-e &gt; Gerenciar Código de Segurança do Contribuinte (CSC)"</em>. Gere um novo código para Produção ou Homologação.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">4</span>
                  <div>
                    <h5 className="font-black text-slate-800 text-xs uppercase">Copie o ID do CSC (ex: 000001) e o Hash do CSC</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">Cole esses dois dados na aba <strong>Configurações</strong> deste módulo para ativar a emissão oficial com QR Code.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 5. Regras de Cancelamento e Guarda de XML */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => toggleAccordion('regras')}
            className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="font-black text-sm uppercase text-slate-900 tracking-tight">
                  5. Prazos Legais de Cancelamento & Guarda dos Arquivos XML
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Normas regulamentares do Ajuste SINIEF e Código Tributário Nacional
                </p>
              </div>
            </div>
            {activeAccordion === 'regras' ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
          </button>

          {activeAccordion === 'regras' && (
            <div className="px-6 pb-6 pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <h4 className="font-black text-slate-900 text-xs uppercase flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span> Prazo de Cancelamento de NFC-e
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    O cancelamento oficial na SEFAZ deve ocorrer em <strong>até 30 minutos após a autorização</strong> (na maioria dos estados) ou <strong>24 horas</strong> se não tiver ocorrido a saída/circulação da mercadoria.
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">Exige justificativa com no mínimo 15 caracteres.</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <h4 className="font-black text-slate-900 text-xs uppercase flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> Guarda Obrigatória do XML (5 Anos)
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    De acordo com o <strong>Art. 173 do Código Tributário Nacional (CTN)</strong>, os arquivos XML assinados das notas autorizadas e canceladas devem ser armazenados digitalmente por no mínimo <strong>5 anos</strong> para fiscalização.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default NfceFiscalGuide;
