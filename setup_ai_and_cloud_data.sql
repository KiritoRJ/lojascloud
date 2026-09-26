-- ==============================================================================
-- SCRIPT DE CORREÇÃO: CHAVE DE API DA IA E CONFIGURAÇÕES GLOBAIS NO SUPER ADMIN
-- ==============================================================================
-- Este script:
-- 1. Remove qualquer Foreign Key na tabela "cloud_data" (eliminando o erro da constraint)
-- 2. Adiciona colunas necessárias com IF NOT EXISTS na tabela "tenants"
-- 3. Insere o registro 'SYSTEM' de forma 100% segura sem falhar em colunas inexistentes
-- 4. Garante a tabela "cloud_data" e permissões RLS liberadas
-- ==============================================================================

-- 1. REMOVER TODAS AS CHAVES ESTRANGEIRAS (FOREIGN KEYS) DA TABELA CLOUD_DATA
-- Executado em bloco anônimo para remover automaticamente qualquer FK sem depender do nome exato
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        WHERE tc.table_schema = 'public'
          AND tc.table_name = 'cloud_data'
          AND tc.constraint_type = 'FOREIGN KEY'
    ) LOOP
        EXECUTE 'ALTER TABLE public.cloud_data DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name) || ' CASCADE;';
    END LOOP;
END $$;

-- 2. GARANTIR QUE AS COLUNAS ESSENCIAIS EXISTAM NA TABELA TENANTS
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS store_name TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS enabled_features JSONB DEFAULT '{"aiFeature": true}'::jsonb;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS ai_credits INTEGER DEFAULT 100;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS ai_limit INTEGER DEFAULT 1000;

-- 3. INSERIR O IDENTIFICADOR 'SYSTEM' NA TABELA TENANTS (APENAS COM ID E STORE_NAME)
INSERT INTO public.tenants (id, store_name)
VALUES ('SYSTEM', 'Configurações Globais do Sistema')
ON CONFLICT (id) DO UPDATE SET store_name = EXCLUDED.store_name;

-- 4. GARANTIR A ESTRUTURA DA TABELA CLOUD_DATA
CREATE TABLE IF NOT EXISTS public.cloud_data (
    tenant_id TEXT NOT NULL,
    store_key TEXT NOT NULL,
    data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (tenant_id, store_key)
);

-- Índices para busca ultrarrápida
CREATE INDEX IF NOT EXISTS idx_cloud_data_tenant_key ON public.cloud_data(tenant_id, store_key);
CREATE INDEX IF NOT EXISTS idx_cloud_data_store_key ON public.cloud_data(store_key);

-- 5. CONFIGURAR POLÍTICAS DE ACESSO (RLS)
ALTER TABLE public.cloud_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso Total Cloud Data" ON public.cloud_data;
DROP POLICY IF EXISTS "Permitir Leitura e Escrita Geral em Cloud Data" ON public.cloud_data;
DROP POLICY IF EXISTS "Permitir leitura para todos" ON public.cloud_data;
DROP POLICY IF EXISTS "Permitir gravacao para autenticados e anon" ON public.cloud_data;

CREATE POLICY "Acesso Total Cloud Data" ON public.cloud_data 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);

GRANT ALL ON TABLE public.cloud_data TO anon, authenticated, service_role;

-- 6. INICIALIZAR REGISTRO DA IA / PLANOS GLOBAIS SE AINDA NÃO EXISTIR
INSERT INTO public.cloud_data (tenant_id, store_key, data_json, updated_at)
VALUES (
    'SYSTEM',
    'global_plans',
    jsonb_build_object(
        'aiDisabledGlobally', false,
        'aiApiKey', '',
        'geminiApiKey', '',
        'updated_at', timezone('utc'::text, now())
    ),
    timezone('utc'::text, now())
)
ON CONFLICT (tenant_id, store_key) DO NOTHING;

-- 7. TABELA DE AUDITORIA E LOGS DE USO DA IA (OPCIONAL)
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id TEXT,
    action TEXT NOT NULL,
    model TEXT,
    input_tokens INTEGER,
    output_tokens INTEGER,
    status TEXT DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_tenant ON public.ai_usage_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON public.ai_usage_logs(created_at);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso Total AI Logs" ON public.ai_usage_logs;
CREATE POLICY "Acesso Total AI Logs" ON public.ai_usage_logs FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.ai_usage_logs TO anon, authenticated, service_role;

-- 8. RECARREGAR O SCHEMA DA API DO SUPABASE (POSTGREST)
NOTIFY pgrst, 'reload schema';
