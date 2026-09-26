-- ==============================================================================
-- SISTEMA TICCELL / PRO OS & GESTÃO - SCRIPT SQL COMPLETO PARA O MÓDULO FISCAL
-- ==============================================================================
-- Execute este script no SQL Editor do Supabase (Dashboard -> SQL Editor -> New query)
-- Ele adiciona com segurança (IF NOT EXISTS) todos os campos e tabelas necessários
-- para o funcionamento completo de NFC-e, NF-e, NFS-e, Tributação e Certificados.
-- ==============================================================================

-- 1. EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. AJUSTES NA TABELA DE LOJAS / EMPRESAS (public.tenants)
-- ==============================================================================
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS cnpj TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS ie TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS im TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS cnae TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS tax_regime TEXT DEFAULT 'simples_nacional';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS city_ibge_code TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS city_name TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS uf TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS csc_id TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS csc_code TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS fiscal_environment TEXT DEFAULT 'homologacao';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS fiscal_mode_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS enabled_features JSONB DEFAULT '{"osTab": true, "customersTab": true, "stockTab": true, "salesTab": true, "financeTab": true, "profiles": true, "xmlExportImport": true, "hideFinancialReports": false, "fiscalTab": true, "fiscalMode": true}'::jsonb;

-- ==============================================================================
-- 3. AJUSTES NA TABELA DE PRODUTOS / ESTOQUE (public.products)
-- Tributação fiscal para emissão de NFC-e (Cupom Fiscal) e NF-e (Nota Grande)
-- ==============================================================================
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ncm TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cest TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cfop TEXT DEFAULT '5102';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS origin INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS csosn TEXT DEFAULT '102';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cst TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS icms_rate NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS pis_rate NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cofins_rate NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'UN';

-- Índices para acelerar buscas fiscais de produtos
CREATE INDEX IF NOT EXISTS idx_products_ncm ON public.products(ncm);
CREATE INDEX IF NOT EXISTS idx_products_cest ON public.products(cest);
CREATE INDEX IF NOT EXISTS idx_products_cfop ON public.products(cfop);

-- ==============================================================================
-- 4. AJUSTES NA TABELA DE VENDAS (public.sales)
-- Vinculação direta com Cupom Fiscal NFC-e ou NF-e emitida no PDV
-- ==============================================================================
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS fiscal_note_number TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS fiscal_note_emitted BOOLEAN DEFAULT false;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS fiscal_note_access_key TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS fiscal_doc_type TEXT DEFAULT 'nfce';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS fiscal_environment TEXT DEFAULT 'homologacao';

-- Índices de consulta de notas em vendas
CREATE INDEX IF NOT EXISTS idx_sales_fiscal_note_number ON public.sales(fiscal_note_number);
CREATE INDEX IF NOT EXISTS idx_sales_fiscal_note_access_key ON public.sales(fiscal_note_access_key);

-- ==============================================================================
-- 5. AJUSTES NA TABELA DE ORDENS DE SERVIÇO (public.service_orders)
-- Vinculação direta com Nota Fiscal de Serviço Eletrônica (NFS-e)
-- ==============================================================================
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS fiscal_note_number TEXT;
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS fiscal_note_emitted BOOLEAN DEFAULT false;
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS fiscal_note_verification_code TEXT;
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS fiscal_note_date TEXT;

-- Índices de consulta de NFS-e em ordens de serviço
CREATE INDEX IF NOT EXISTS idx_service_orders_fiscal_note ON public.service_orders(fiscal_note_number);

-- ==============================================================================
-- 6. AJUSTES NA TABELA DE CLIENTES (public.customers)
-- Dados cadastrais exigidos para emissão de NF-e e NFS-e nominais
-- ==============================================================================
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS document TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS cnpj TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS ie TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS number TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS complement TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS uf TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS city_ibge TEXT;

-- ==============================================================================
-- 7. TABELA CENTRAL DE ARMAZENAMENTO DINÂMICO (public.cloud_data)
-- Armazena configurações fiscais, certificados e credenciais de provedores
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.cloud_data (
    tenant_id TEXT NOT NULL,
    store_key TEXT NOT NULL,
    data_json JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (tenant_id, store_key)
);

CREATE INDEX IF NOT EXISTS idx_cloud_data_tenant_key ON public.cloud_data(tenant_id, store_key);

-- ==============================================================================
-- 8. TABELA ESPECÍFICA PARA DOCUMENTOS FISCAIS (public.fiscal_notes)
-- Armazena o histórico completo de NFC-e, NF-e e NFS-e, DANFE e XMLs
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.fiscal_notes (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    doc_type TEXT NOT NULL, -- 'nfce', 'nfe', 'nfse'
    number TEXT NOT NULL,
    series TEXT DEFAULT '1',
    access_key TEXT,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    status TEXT DEFAULT 'authorized', -- 'authorized', 'processing', 'rejected', 'canceled', 'inutilized', 'draft'
    environment TEXT DEFAULT 'homologacao', -- 'homologacao', 'producao'
    sale_id TEXT,
    service_order_id TEXT,
    customer_name TEXT,
    customer_document TEXT,
    total_amount NUMERIC(10, 2) DEFAULT 0,
    xml_content TEXT,
    pdf_url TEXT,
    protocol TEXT,
    qr_code_url TEXT,
    error_message TEXT,
    cancel_reason TEXT,
    canceled_at TIMESTAMP WITH TIME ZONE,
    data_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fiscal_notes_tenant ON public.fiscal_notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_notes_access_key ON public.fiscal_notes(access_key);
CREATE INDEX IF NOT EXISTS idx_fiscal_notes_status ON public.fiscal_notes(status);
CREATE INDEX IF NOT EXISTS idx_fiscal_notes_type ON public.fiscal_notes(doc_type);

-- ==============================================================================
-- 9. TABELA DE EVENTOS FISCAIS (public.fiscal_events)
-- Cartas de Correção (CC-e), Cancelamentos, Inutilização de Sequencial e Manifestos
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.fiscal_events (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    doc_type TEXT NOT NULL, -- 'nfe', 'nfce', 'nfse'
    event_type TEXT NOT NULL, -- 'cce', 'cancelamento', 'inutilizacao', 'manifestacao'
    access_key TEXT,
    doc_number TEXT,
    series TEXT,
    sequence INTEGER DEFAULT 1,
    description TEXT,
    correction_text TEXT,
    justification TEXT,
    protocol TEXT,
    status TEXT DEFAULT 'authorized',
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    xml_content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fiscal_events_tenant ON public.fiscal_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_events_key ON public.fiscal_events(access_key);

-- ==============================================================================
-- 10. TABELA DE XMLS ARQUIVADOS E IMPORTADOS (public.fiscal_xmls)
-- Gestão de XML de entrada de fornecedores e saída de notas
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.fiscal_xmls (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    type TEXT NOT NULL, -- 'entrada', 'saida'
    doc_type TEXT NOT NULL, -- 'nfe', 'nfce', 'nfse'
    access_key TEXT,
    number TEXT,
    series TEXT,
    emitter_name TEXT,
    emitter_cnpj TEXT,
    dest_name TEXT,
    dest_cnpj_cpf TEXT,
    issued_at TIMESTAMP WITH TIME ZONE,
    total_amount NUMERIC(10, 2) DEFAULT 0,
    xml_content TEXT,
    status TEXT DEFAULT 'archived', -- 'imported_stock', 'archived', 'pending'
    items_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fiscal_xmls_tenant ON public.fiscal_xmls(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_xmls_access_key ON public.fiscal_xmls(access_key);

-- ==============================================================================
-- 11. POLÍTICAS DE ACESSO TOTAL (ROW LEVEL SECURITY - RLS)
-- Permite leitura e escrita pelo cliente Supabase / API da aplicação
-- ==============================================================================
ALTER TABLE public.cloud_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso Total cloud_data" ON public.cloud_data;
CREATE POLICY "Acesso Total cloud_data" ON public.cloud_data FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.fiscal_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso Total fiscal_notes" ON public.fiscal_notes;
CREATE POLICY "Acesso Total fiscal_notes" ON public.fiscal_notes FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.fiscal_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso Total fiscal_events" ON public.fiscal_events;
CREATE POLICY "Acesso Total fiscal_events" ON public.fiscal_events FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.fiscal_xmls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso Total fiscal_xmls" ON public.fiscal_xmls;
CREATE POLICY "Acesso Total fiscal_xmls" ON public.fiscal_xmls FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 12. REALTIME (SINCRONIZAÇÃO EM TEMPO REAL ENTRE DISPOSITIVOS)
-- ==============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'fiscal_notes'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.fiscal_notes;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'fiscal_events'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.fiscal_events;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'cloud_data'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.cloud_data;
    END IF;
END $$;

-- ==============================================================================
-- 13. RECARREGAR O SCHEMA CACHE DO POSTGREST (SUPABASE)
-- ==============================================================================
NOTIFY pgrst, 'reload schema';
