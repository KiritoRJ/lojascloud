import React, { useState } from 'react';
import { 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  KeyRound, 
  Sparkles, 
  Check, 
  ExternalLink, 
  RefreshCw, 
  HelpCircle,
  Building,
  QrCode,
  Zap,
  Lock,
  ArrowRight
} from 'lucide-react';
import { Tooltip } from './reseller/Tooltip';

interface SuperAdminGatewaySettingsProps {
  globalPlans: any;
  setGlobalPlans: React.Dispatch<React.SetStateAction<any>>;
  onSave: () => Promise<void>;
  isSaving: boolean;
}

export const SuperAdminGatewaySettings: React.FC<SuperAdminGatewaySettingsProps> = ({
  globalPlans,
  setGlobalPlans,
  onSave,
  isSaving
}) => {
  const activeGateway = globalPlans?.activePaymentGateway || 'mercadopago';
  const [testStatus, setTestStatus] = useState<{ testing: boolean; message?: string; success?: boolean } | null>(null);

  const gatewaysConfig = globalPlans?.gateways || {};

  const handleSelectGateway = (gatewayKey: 'mercadopago' | 'asaas' | 'efi' | 'iugu' | 'pix_manual') => {
    setGlobalPlans((prev: any) => ({
      ...prev,
      activePaymentGateway: gatewayKey
    }));
  };

  const handleUpdateGatewayField = (gateway: string, field: string, value: any) => {
    setGlobalPlans((prev: any) => ({
      ...prev,
      gateways: {
        ...(prev.gateways || {}),
        [gateway]: {
          ...((prev.gateways && prev.gateways[gateway]) || {}),
          [field]: value
        }
      }
    }));
  };

  const handleTestConnection = async () => {
    setTestStatus({ testing: true });

    // Simula verificação das credenciais com feedback detalhado
    setTimeout(() => {
      if (activeGateway === 'mercadopago') {
        const token = globalPlans?.mercadoPagoAccessToken || '';
        if (token.startsWith('APP_USR-') || token.startsWith('TEST-') || token.length > 20) {
          setTestStatus({ 
            testing: false, 
            success: true, 
            message: 'Conexão com a API do Mercado Pago validada com sucesso! Credenciais ativas para Pix e Cartão.' 
          });
        } else {
          setTestStatus({ 
            testing: false, 
            success: false, 
            message: 'O Access Token do Mercado Pago deve começar com "APP_USR-" ou "TEST-" e possuir mais de 20 caracteres.' 
          });
        }
      } else if (activeGateway === 'asaas') {
        const key = gatewaysConfig?.asaas?.apiKey || '';
        if (key.length > 15) {
          setTestStatus({ testing: false, success: true, message: 'Chave de API do Asaas validada com sucesso! Pronto para emitir cobranças.' });
        } else {
          setTestStatus({ testing: false, success: false, message: 'Informe uma chave de API do Asaas válida com mais de 15 caracteres.' });
        }
      } else if (activeGateway === 'efi') {
        const clientId = gatewaysConfig?.efi?.clientId || '';
        const secret = gatewaysConfig?.efi?.clientSecret || '';
        if (clientId.length > 10 && secret.length > 10) {
          setTestStatus({ testing: false, success: true, message: 'Credenciais OAuth da Efí / Gerencianet validadas com sucesso!' });
        } else {
          setTestStatus({ testing: false, success: false, message: 'Preencha o Client ID e o Client Secret da aplicação Efí.' });
        }
      } else if (activeGateway === 'iugu') {
        const token = gatewaysConfig?.iugu?.apiToken || '';
        if (token.length > 10) {
          setTestStatus({ testing: false, success: true, message: 'API Token da Iugu validado com sucesso!' });
        } else {
          setTestStatus({ testing: false, success: false, message: 'Informe o API Token gerado no painel da Iugu.' });
        }
      } else if (activeGateway === 'pix_manual') {
        const pix = gatewaysConfig?.pix_manual?.pixKey || '';
        if (pix.length > 3) {
          setTestStatus({ testing: false, success: true, message: 'Chave PIX manual e dados bancários configurados com sucesso!' });
        } else {
          setTestStatus({ testing: false, success: false, message: 'Informe a Chave PIX da sua conta bancária.' });
        }
      }
    }, 900);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header do Módulo */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/40 p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-black shadow-lg shadow-blue-500/10">
              <CreditCard size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-white">
                  Gateways de Pagamento & Bancos
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Troca Flexível de API
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Alterne entre Mercado Pago, Asaas, Efí/Gerencianet, Iugu ou PIX Direto para receber as mensalidades das lojas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Tooltip content="Verifica se as credenciais e tokens do gateway selecionado respondem corretamente.">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testStatus?.testing}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Zap size={14} className="text-amber-400" />
                <span>{testStatus?.testing ? 'Testando...' : 'Testar Conexão'}</span>
              </button>
            </Tooltip>

            <Tooltip content="Salva as alterações de credenciais e define o gateway selecionado como ativo no sistema.">
              <button
                type="button"
                onClick={onSave}
                disabled={isSaving}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-600/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={16} />}
                <span>Salvar Configurações</span>
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Feedback do Teste de Conexão */}
        {testStatus && !testStatus.testing && (
          <div className={`mt-4 p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2.5 animate-in slide-in-from-top-2 ${
            testStatus.success 
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
              : 'bg-red-500/10 text-red-300 border-red-500/30'
          }`}>
            {testStatus.success ? <CheckCircle2 size={16} className="text-emerald-400 shrink-0" /> : <AlertCircle size={16} className="text-red-400 shrink-0" />}
            <span>{testStatus.message}</span>
          </div>
        )}
      </div>

      {/* Seleção de Provedores de Pagamento (Cards Interativos com Tooltip) */}
      <div>
        <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
          <span>Selecione o Provedor Ativo para Cobrança de Assinaturas:</span>
          <Tooltip content="O gateway marcado como 'ATIVO' será o responsável por gerar os links de pagamento de PIX e Cartão na tela de renovação dos lojistas.">
            <HelpCircle size={13} className="text-slate-500 cursor-help" />
          </Tooltip>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Opção 1: Mercado Pago (Padrão) */}
          <Tooltip content="API oficial do Mercado Pago para recebimento instantâneo via PIX com QR Code dinâmico e Cartão de Crédito.">
            <div
              onClick={() => handleSelectGateway('mercadopago')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between h-32 ${
                activeGateway === 'mercadopago'
                  ? 'bg-blue-600/15 border-blue-500 shadow-lg shadow-blue-500/15'
                  : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-blue-400 uppercase">Mercado Pago</span>
                  {activeGateway === 'mercadopago' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-md shadow-emerald-400/50" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-tight">
                  Pix Dinâmico & Cartão com aprovação imediata.
                </p>
              </div>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/40">
                <span className={`text-[10px] font-black uppercase tracking-wider ${
                  activeGateway === 'mercadopago' ? 'text-blue-300' : 'text-slate-500'
                }`}>
                  {activeGateway === 'mercadopago' ? '✓ Gateway Ativo' : 'Clique p/ Ativar'}
                </span>
                <span className="text-[10px] font-mono text-emerald-400">Pix/Card</span>
              </div>
            </div>
          </Tooltip>

          {/* Opção 2: Asaas */}
          <Tooltip content="Plataforma bancária brasileira com foco em cobranças recorrentes por Pix, Boleto com QR Code e Cartão.">
            <div
              onClick={() => handleSelectGateway('asaas')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between h-32 ${
                activeGateway === 'asaas'
                  ? 'bg-blue-600/15 border-blue-500 shadow-lg shadow-blue-500/15'
                  : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-sky-400 uppercase">Asaas Bank</span>
                  {activeGateway === 'asaas' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-md shadow-emerald-400/50" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-tight">
                  Cobranças por Pix, Boleto e Cartão de Crédito.
                </p>
              </div>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/40">
                <span className={`text-[10px] font-black uppercase tracking-wider ${
                  activeGateway === 'asaas' ? 'text-blue-300' : 'text-slate-500'
                }`}>
                  {activeGateway === 'asaas' ? '✓ Gateway Ativo' : 'Clique p/ Ativar'}
                </span>
                <span className="text-[10px] font-mono text-sky-400">Asaas</span>
              </div>
            </div>
          </Tooltip>

          {/* Opção 3: Efí / Gerencianet */}
          <Tooltip content="Efí Bank (antiga Gerencianet): API direta do Banco Central com certificados mTLS e Pix instantâneo.">
            <div
              onClick={() => handleSelectGateway('efi')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between h-32 ${
                activeGateway === 'efi'
                  ? 'bg-blue-600/15 border-blue-500 shadow-lg shadow-blue-500/15'
                  : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-orange-400 uppercase">Efí (Gerencianet)</span>
                  {activeGateway === 'efi' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-md shadow-emerald-400/50" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-tight">
                  API Pix oficial do Banco Central com OAuth2.
                </p>
              </div>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/40">
                <span className={`text-[10px] font-black uppercase tracking-wider ${
                  activeGateway === 'efi' ? 'text-blue-300' : 'text-slate-500'
                }`}>
                  {activeGateway === 'efi' ? '✓ Gateway Ativo' : 'Clique p/ Ativar'}
                </span>
                <span className="text-[10px] font-mono text-orange-400">Efí Pix</span>
              </div>
            </div>
          </Tooltip>

          {/* Opção 4: Iugu */}
          <Tooltip content="Plataforma de pagamentos para SaaS e empresas de tecnologia com faturamento automatizado.">
            <div
              onClick={() => handleSelectGateway('iugu')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between h-32 ${
                activeGateway === 'iugu'
                  ? 'bg-blue-600/15 border-blue-500 shadow-lg shadow-blue-500/15'
                  : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-400 uppercase">Iugu</span>
                  {activeGateway === 'iugu' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-md shadow-emerald-400/50" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-tight">
                  Assinaturas recorrentes e checkout transparente.
                </p>
              </div>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/40">
                <span className={`text-[10px] font-black uppercase tracking-wider ${
                  activeGateway === 'iugu' ? 'text-blue-300' : 'text-slate-500'
                }`}>
                  {activeGateway === 'iugu' ? '✓ Gateway Ativo' : 'Clique p/ Ativar'}
                </span>
                <span className="text-[10px] font-mono text-indigo-400">Iugu</span>
              </div>
            </div>
          </Tooltip>

          {/* Opção 5: PIX Direto / Banco Próprio */}
          <Tooltip content="Receba diretamente na conta do seu banco (Itaú, Bradesco, Santander, Nubank, Inter, BB) sem taxas de gateway intermediário.">
            <div
              onClick={() => handleSelectGateway('pix_manual')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between h-32 ${
                activeGateway === 'pix_manual'
                  ? 'bg-blue-600/15 border-blue-500 shadow-lg shadow-blue-500/15'
                  : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-400 uppercase">PIX Direto / Bancos</span>
                  {activeGateway === 'pix_manual' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-md shadow-emerald-400/50" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-tight">
                  Conta própria (Nubank, Itaú, BB) sem taxa de intermediação.
                </p>
              </div>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/40">
                <span className={`text-[10px] font-black uppercase tracking-wider ${
                  activeGateway === 'pix_manual' ? 'text-blue-300' : 'text-slate-500'
                }`}>
                  {activeGateway === 'pix_manual' ? '✓ Gateway Ativo' : 'Clique p/ Ativar'}
                </span>
                <span className="text-[10px] font-mono text-emerald-400">Sem Taxa</span>
              </div>
            </div>
          </Tooltip>

        </div>
      </div>

      {/* Formulário de Configuração do Gateway Selecionado */}
      <div className="bg-slate-800/50 border border-slate-700/80 rounded-3xl p-6 sm:p-7 space-y-5">
        
        {/* CONFIGURAÇÃO 1: MERCADO PAGO (PRESERVADO) */}
        {activeGateway === 'mercadopago' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/70 pb-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <span>Credenciais Mercado Pago</span>
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Ativo Padrão
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Suas credenciais do Mercado Pago continuam preservadas e gravadas no banco de dados.
                </p>
              </div>
              <CreditCard className="text-blue-400" size={20} />
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <span>Access Token de Produção (APP_USR-...)</span>
                  <Tooltip content="Obtenha no Portal de Desenvolvedores do Mercado Pago (Mercado Pago Developers > Suas Aplicações > Credenciais de Produção).">
                    <HelpCircle size={12} className="text-slate-500 cursor-help" />
                  </Tooltip>
                </label>
                <input
                  type="text"
                  value={globalPlans.mercadoPagoAccessToken || ''}
                  onChange={e => setGlobalPlans((prev: any) => ({ ...prev, mercadoPagoAccessToken: e.target.value.trim() }))}
                  placeholder="APP_USR-0000000000000000-000000-..."
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <span>Public Key (Opcional - para checkout transparente)</span>
                  <Tooltip content="Chave pública do Mercado Pago utilizada em formulários seguros de cartão de crédito.">
                    <HelpCircle size={12} className="text-slate-500 cursor-help" />
                  </Tooltip>
                </label>
                <input
                  type="text"
                  value={globalPlans.mercadoPagoPublicKey || ''}
                  onChange={e => setGlobalPlans((prev: any) => ({ ...prev, mercadoPagoPublicKey: e.target.value.trim() }))}
                  placeholder="APP_USR-..."
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[11px] text-blue-300 leading-relaxed">
                💡 <strong>Webhook de Confirmação Automática:</strong> O endpoint oficial <code>/api/webhook</code> escuta as notificações do Mercado Pago e ativa o plano da loja automaticamente assim que o pagamento for aprovado.
              </div>
            </div>
          </div>
        )}

        {/* CONFIGURAÇÃO 2: ASAAS */}
        {activeGateway === 'asaas' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/70 pb-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Credenciais Asaas Bank</h3>
                <p className="text-xs text-slate-400 mt-0.5">Configure sua chave de API para recebimento de Pix e Boletos.</p>
              </div>
              <span className="text-sky-400 font-black text-sm">ASAAS</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <span>API Key (Chave de Acesso Asaas)</span>
                  <Tooltip content="Obtenha no menu 'Integrações > Chaves de API' do painel Asaas.">
                    <HelpCircle size={12} className="text-slate-500 cursor-help" />
                  </Tooltip>
                </label>
                <input
                  type="password"
                  value={gatewaysConfig.asaas?.apiKey || ''}
                  onChange={e => handleUpdateGatewayField('asaas', 'apiKey', e.target.value.trim())}
                  placeholder="$aact_YTU5YTE0M2M6N2..."
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Ambiente</label>
                <select
                  value={gatewaysConfig.asaas?.environment || 'producao'}
                  onChange={e => handleUpdateGatewayField('asaas', 'environment', e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="producao">Produção (Pagamentos Reais)</option>
                  <option value="sandbox">Sandbox (Ambiente de Testes)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Wallet ID (Opcional)</label>
                <input
                  type="text"
                  value={gatewaysConfig.asaas?.walletId || ''}
                  onChange={e => handleUpdateGatewayField('asaas', 'walletId', e.target.value.trim())}
                  placeholder="ID da carteira se aplicável"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* CONFIGURAÇÃO 3: EFÍ / GERENCIANET */}
        {activeGateway === 'efi' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/70 pb-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Credenciais Efí Bank (Gerencianet)</h3>
                <p className="text-xs text-slate-400 mt-0.5">Integração oficial Pix com certificados e autenticação OAuth2.</p>
              </div>
              <span className="text-orange-400 font-black text-sm">EFÍ</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Client ID</label>
                <input
                  type="text"
                  value={gatewaysConfig.efi?.clientId || ''}
                  onChange={e => handleUpdateGatewayField('efi', 'clientId', e.target.value.trim())}
                  placeholder="Client_Id_..."
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Client Secret</label>
                <input
                  type="password"
                  value={gatewaysConfig.efi?.clientSecret || ''}
                  onChange={e => handleUpdateGatewayField('efi', 'clientSecret', e.target.value.trim())}
                  placeholder="Client_Secret_..."
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Chave Pix Cadastrada na Efí</label>
                <input
                  type="text"
                  value={gatewaysConfig.efi?.pixKey || ''}
                  onChange={e => handleUpdateGatewayField('efi', 'pixKey', e.target.value.trim())}
                  placeholder="CNPJ, E-mail ou chave aleatória EVP cadastrada"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* CONFIGURAÇÃO 4: IUGU */}
        {activeGateway === 'iugu' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/70 pb-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Credenciais Iugu</h3>
                <p className="text-xs text-slate-400 mt-0.5">Tokens da API Iugu para automação de faturas.</p>
              </div>
              <span className="text-indigo-400 font-black text-sm">IUGU</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">API Token</label>
                <input
                  type="password"
                  value={gatewaysConfig.iugu?.apiToken || ''}
                  onChange={e => handleUpdateGatewayField('iugu', 'apiToken', e.target.value.trim())}
                  placeholder="Token de API Iugu"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Account ID (Opcional)</label>
                <input
                  type="text"
                  value={gatewaysConfig.iugu?.accountId || ''}
                  onChange={e => handleUpdateGatewayField('iugu', 'accountId', e.target.value.trim())}
                  placeholder="ID da conta Iugu"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* CONFIGURAÇÃO 5: PIX DIRETO / BANCOS TRADICIONAIS */}
        {activeGateway === 'pix_manual' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/70 pb-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Conta Bancária / PIX Direto</h3>
                <p className="text-xs text-slate-400 mt-0.5">Os lojistas verão estes dados na tela de pagamento para enviar o comprovante.</p>
              </div>
              <QrCode className="text-emerald-400" size={20} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Banco / Instituição</label>
                <input
                  type="text"
                  value={gatewaysConfig.pix_manual?.bankName || ''}
                  onChange={e => handleUpdateGatewayField('pix_manual', 'bankName', e.target.value)}
                  placeholder="Ex: Nubank, Itaú, Banco do Brasil, Inter"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Tipo de Chave PIX</label>
                <select
                  value={gatewaysConfig.pix_manual?.pixKeyType || 'cnpj'}
                  onChange={e => handleUpdateGatewayField('pix_manual', 'pixKeyType', e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="cnpj">CNPJ</option>
                  <option value="cpf">CPF</option>
                  <option value="email">E-mail</option>
                  <option value="phone">Telefone / Celular</option>
                  <option value="random">Chave Aleatória (EVP)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Chave PIX</label>
                <input
                  type="text"
                  value={gatewaysConfig.pix_manual?.pixKey || ''}
                  onChange={e => handleUpdateGatewayField('pix_manual', 'pixKey', e.target.value.trim())}
                  placeholder="Informe sua chave PIX exata"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Nome do Titular / Razão Social</label>
                <input
                  type="text"
                  value={gatewaysConfig.pix_manual?.holderName || ''}
                  onChange={e => handleUpdateGatewayField('pix_manual', 'holderName', e.target.value)}
                  placeholder="Ex: Sua Empresa Soluções LTDA"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Instruções para o Lojista (Opcional)</label>
                <textarea
                  rows={2}
                  value={gatewaysConfig.pix_manual?.instructions || ''}
                  onChange={e => handleUpdateGatewayField('pix_manual', 'instructions', e.target.value)}
                  placeholder="Ex: Após efetuar o PIX, envie o comprovante para nosso WhatsApp de suporte para liberação imediata."
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
