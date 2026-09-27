-- ==============================================================================
-- SCRIPT SQL CONSOLIDADO - TODAS AS MODIFICAÇÕES FEITAS
-- ==============================================================================
-- Pode ser executado diretamente no SQL Editor do Supabase.
-- É 100% idempotente (utiliza IF NOT EXISTS, DROP IF EXISTS e ON CONFLICT).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. RASTREAMENTO PÚBLICO DE ORDENS DE SERVIÇO (OS TRACKING)
-- ------------------------------------------------------------------------------
ALTER TABLE public.service_orders 
ADD COLUMN IF NOT EXISTS tracking_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS public_notes TEXT,
ADD COLUMN IF NOT EXISTS is_tracking_enabled BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_service_orders_tracking_token ON public.service_orders(tracking_token);

-- ------------------------------------------------------------------------------
-- 2. CADASTRO DE FORNECEDORES E VÍNCULO COM PEÇAS DE OS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS part_supplier_id TEXT;
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS part_supplier_warranty TEXT;

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total de fornecedores por tenant" ON public.suppliers;
DROP POLICY IF EXISTS "Acesso Total Suppliers" ON public.suppliers;
CREATE POLICY "Acesso Total Suppliers" ON public.suppliers FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.suppliers TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. CLIENTES E VÍNCULO COM ORDENS DE SERVIÇO
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY
);

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS document TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS notes_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Sincronizar campo phone com phone_number se phone já existia
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'phone'
    ) THEN
        UPDATE public.customers 
        SET phone_number = phone 
        WHERE (phone_number IS NULL OR phone_number = '') AND (phone IS NOT NULL AND phone <> '');
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customers_tenant ON public.customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone_number);
CREATE INDEX IF NOT EXISTS idx_customers_document ON public.customers(document);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_is_deleted ON public.customers(is_deleted);

ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS customer_id TEXT;
CREATE INDEX IF NOT EXISTS idx_service_orders_customer_id ON public.service_orders(customer_id);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso Total Customers" ON public.customers;
CREATE POLICY "Acesso Total Customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.customers TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. INTEGRAÇÃO USUÁRIOS, FUNCIONÁRIOS, COMISSÕES E METAS
-- ------------------------------------------------------------------------------
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS seller_id TEXT;
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS technician_id TEXT;
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS seller_id TEXT;

-- Atualização da tabela goal_tiers
DO $$
DECLARE
    emp_type TEXT;
BEGIN
    SELECT data_type INTO emp_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'id';

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'goal_tiers' AND column_name = 'employee_id') THEN
        IF emp_type = 'uuid' THEN
            ALTER TABLE public.goal_tiers ADD COLUMN employee_id UUID;
        ELSE
            ALTER TABLE public.goal_tiers ADD COLUMN employee_id TEXT;
        END IF;
    END IF;
END $$;
ALTER TABLE public.goal_tiers ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.goal_tiers ADD COLUMN IF NOT EXISTS bonus_type TEXT CHECK (bonus_type IN ('percent', 'fixed')) DEFAULT 'percent';
ALTER TABLE public.goal_tiers ADD COLUMN IF NOT EXISTS bonus_value NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.goal_tiers ADD COLUMN IF NOT EXISTS calculation_base TEXT DEFAULT 'gross_sale';

-- Atualização da tabela commission_rules
DO $$
DECLARE
    emp_type TEXT;
BEGIN
    SELECT data_type INTO emp_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'id';

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'commission_rules' AND column_name = 'employee_id') THEN
        IF emp_type = 'uuid' THEN
            ALTER TABLE public.commission_rules ADD COLUMN employee_id UUID;
        ELSE
            ALTER TABLE public.commission_rules ADD COLUMN employee_id TEXT;
        END IF;
    END IF;
END $$;
ALTER TABLE public.commission_rules ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.commission_rules ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.commission_rules ADD COLUMN IF NOT EXISTS target_type TEXT;
ALTER TABLE public.commission_rules ADD COLUMN IF NOT EXISTS target_id TEXT;
ALTER TABLE public.commission_rules ADD COLUMN IF NOT EXISTS employee_id UUID;
ALTER TABLE public.commission_rules ADD COLUMN IF NOT EXISTS calculation_base TEXT DEFAULT 'gross_sale';
ALTER TABLE public.commission_rules ADD COLUMN IF NOT EXISTS value NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.commission_rules ADD COLUMN IF NOT EXISTS min_amount NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.commission_rules ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1;
ALTER TABLE public.commission_rules ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- ------------------------------------------------------------------------------
-- 5. CHAVES ESTRANGEIRAS E INTEGRIDADE (ON DELETE CASCADE)
-- ------------------------------------------------------------------------------
-- Unifica e alinha tipos entre employees e tabelas dependentes (commissions_log, goal_tiers, commission_rules)
-- Se employees.id ou employee_id forem TEXT/UUID divergentes, converte com segurança:
DO $$
DECLARE
    emp_type TEXT;
BEGIN
    SELECT data_type INTO emp_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'id';

    -- Se employees.id for TEXT, converte as colunas employee_id das filhas para TEXT
    IF emp_type = 'text' THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'commissions_log' AND column_name = 'employee_id' AND data_type <> 'text') THEN
            ALTER TABLE public.commissions_log ALTER COLUMN employee_id TYPE TEXT USING employee_id::text;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'goal_tiers' AND column_name = 'employee_id' AND data_type <> 'text') THEN
            ALTER TABLE public.goal_tiers ALTER COLUMN employee_id TYPE TEXT USING employee_id::text;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'commission_rules' AND column_name = 'employee_id' AND data_type <> 'text') THEN
            ALTER TABLE public.commission_rules ALTER COLUMN employee_id TYPE TEXT USING employee_id::text;
        END IF;
    -- Se employees.id for UUID, converte as colunas employee_id das filhas para UUID
    ELSIF emp_type = 'uuid' THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'commissions_log' AND column_name = 'employee_id' AND data_type <> 'uuid') THEN
            ALTER TABLE public.commissions_log ALTER COLUMN employee_id TYPE UUID USING (employee_id::text)::uuid;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'goal_tiers' AND column_name = 'employee_id' AND data_type <> 'uuid') THEN
            ALTER TABLE public.goal_tiers ALTER COLUMN employee_id TYPE UUID USING (employee_id::text)::uuid;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'commission_rules' AND column_name = 'employee_id' AND data_type <> 'uuid') THEN
            ALTER TABLE public.commission_rules ALTER COLUMN employee_id TYPE UUID USING (employee_id::text)::uuid;
        END IF;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Aviso na conversão de tipos de employee_id: %', SQLERRM;
END $$;

-- Drop constraints antigas para recriação limpa
ALTER TABLE IF EXISTS public.employees DROP CONSTRAINT IF EXISTS employees_user_id_fkey;
ALTER TABLE IF EXISTS public.commissions_log DROP CONSTRAINT IF EXISTS commissions_log_employee_id_fkey;
ALTER TABLE IF EXISTS public.goal_tiers DROP CONSTRAINT IF EXISTS goal_tiers_employee_id_fkey;
ALTER TABLE IF EXISTS public.commission_rules DROP CONSTRAINT IF EXISTS commission_rules_employee_id_fkey;

-- Recriação das FKs com verificação de compatibilidade dinâmica
DO $$
BEGIN
    -- FK employees -> users (se a tabela users existir)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        BEGIN
            ALTER TABLE public.employees
              ADD CONSTRAINT employees_user_id_fkey
              FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Não foi possível criar employees_user_id_fkey: %', SQLERRM;
        END;
    END IF;

    -- FK commissions_log -> employees
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'commissions_log') THEN
        BEGIN
            ALTER TABLE public.commissions_log
              ADD CONSTRAINT commissions_log_employee_id_fkey
              FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Não foi possível criar commissions_log_employee_id_fkey: %', SQLERRM;
        END;
    END IF;

    -- FK goal_tiers -> employees
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goal_tiers') THEN
        BEGIN
            ALTER TABLE public.goal_tiers
              ADD CONSTRAINT goal_tiers_employee_id_fkey
              FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Não foi possível criar goal_tiers_employee_id_fkey: %', SQLERRM;
        END;
    END IF;

    -- FK commission_rules -> employees
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'commission_rules') THEN
        BEGIN
            ALTER TABLE public.commission_rules
              ADD CONSTRAINT commission_rules_employee_id_fkey
              FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Não foi possível criar commission_rules_employee_id_fkey: %', SQLERRM;
        END;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 6. PERMISSÕES RLS PARA COMISSÕES E FUNCIONÁRIOS
-- ------------------------------------------------------------------------------
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso Total Employees" ON public.employees;
CREATE POLICY "Acesso Total Employees" ON public.employees FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso Total Commission Rules" ON public.commission_rules;
CREATE POLICY "Acesso Total Commission Rules" ON public.commission_rules FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.goal_tiers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso Total Goal Tiers" ON public.goal_tiers;
CREATE POLICY "Acesso Total Goal Tiers" ON public.goal_tiers FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.commissions_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso Total Commissions Log" ON public.commissions_log;
CREATE POLICY "Acesso Total Commissions Log" ON public.commissions_log FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 7. CHAVES DE API DE IA, LIMITES E DADOS GLOBAIS EM NUVEM (CLOUD_DATA)
-- ------------------------------------------------------------------------------
-- Remove qualquer Foreign Key na tabela cloud_data para evitar bloqueios de FK
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

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS store_name TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS enabled_features JSONB DEFAULT '{"aiFeature": true}'::jsonb;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS ai_credits INTEGER DEFAULT 100;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS ai_limit INTEGER DEFAULT 1000;

INSERT INTO public.tenants (id, store_name)
VALUES ('SYSTEM', 'Configurações Globais do Sistema')
ON CONFLICT (id) DO UPDATE SET store_name = EXCLUDED.store_name;

CREATE TABLE IF NOT EXISTS public.cloud_data (
    tenant_id TEXT NOT NULL,
    store_key TEXT NOT NULL,
    data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (tenant_id, store_key)
);

CREATE INDEX IF NOT EXISTS idx_cloud_data_tenant_key ON public.cloud_data(tenant_id, store_key);
CREATE INDEX IF NOT EXISTS idx_cloud_data_store_key ON public.cloud_data(store_key);

ALTER TABLE public.cloud_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso Total Cloud Data" ON public.cloud_data;
DROP POLICY IF EXISTS "Permitir Leitura e Escrita Geral em Cloud Data" ON public.cloud_data;
DROP POLICY IF EXISTS "Permitir leitura para todos" ON public.cloud_data;
DROP POLICY IF EXISTS "Permitir gravacao para autenticados e anon" ON public.cloud_data;

CREATE POLICY "Acesso Total Cloud Data" ON public.cloud_data FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.cloud_data TO anon, authenticated, service_role;

-- Limites por Tenant
CREATE TABLE IF NOT EXISTS public.tenant_limits (
  tenant_id TEXT PRIMARY KEY,
  max_os INTEGER DEFAULT 999,
  max_products INTEGER DEFAULT 999,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------------------------
-- 8. RECARREGAR O SCHEMA DA API DO SUPABASE (POSTGREST)
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
