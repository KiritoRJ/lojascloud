-- ==============================================================================
-- MIGRAÇÃO FISCAL & MEI PARA SUPABASE (ASSISTÊNCIA PRO / ERP)
-- Execute este script no SQL Editor do seu Dashboard Supabase (supabase.com)
-- Ele adiciona todas as colunas fiscais aos produtos e garante a persistência total.
-- ==============================================================================

-- 1. Garante que a tabela central de armazenamento dinâmico 'cloud_data' exista
CREATE TABLE IF NOT EXISTS public.cloud_data (
    tenant_id TEXT NOT NULL,
    store_key TEXT NOT NULL,
    data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (tenant_id, store_key)
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_cloud_data_tenant_key ON public.cloud_data(tenant_id, store_key);
CREATE INDEX IF NOT EXISTS idx_cloud_data_store_key ON public.cloud_data(store_key);

-- Permissões de RLS para cloud_data
ALTER TABLE public.cloud_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso Total Cloud Data" ON public.cloud_data;
CREATE POLICY "Acesso Total Cloud Data" ON public.cloud_data FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.cloud_data TO anon, authenticated, service_role;

-- 2. Adiciona todas as colunas fiscais necessárias na tabela 'products'
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ncm TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cest TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cfop TEXT DEFAULT '5102';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS origin INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS csosn TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS csosn_cst TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cst TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cst_pis TEXT DEFAULT '07';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cst_cofins TEXT DEFAULT '07';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS crt_code TEXT DEFAULT '4';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tax_profile_id TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tax_profile_name TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS icms_rate NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS pis_rate NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cofins_rate NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'UN';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS fiscal_data JSONB DEFAULT '{}'::jsonb;

-- Permissões de RLS na tabela products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso Total Products" ON public.products;
CREATE POLICY "Acesso Total Products" ON public.products FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.products TO anon, authenticated, service_role;

-- 3. Habilita Realtime para as tabelas 'products' e 'cloud_data'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'products'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'cloud_data'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.cloud_data;
    END IF;
END $$;

-- 4. Notifica o PostgREST para recarregar o schema imediatamente
NOTIFY pgrst, 'reload schema';
