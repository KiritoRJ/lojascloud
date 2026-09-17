-- ==============================================================================
-- SISTEMA TICCELL / PRO OS & GESTÃO - ESQUEMA COMPLETO CONSOLIDADO PARA SUPABASE
-- Execute este script completo no SQL Editor do seu projeto Supabase
-- ==============================================================================

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABELAS PRINCIPAIS DO SISTEMA MULTI-TENANT
-- ==============================================================================

-- Tabela de Lojas / Empresas (Tenants)
CREATE TABLE IF NOT EXISTS public.tenants (
    id TEXT PRIMARY KEY,
    name TEXT,
    username TEXT,
    store_name TEXT,
    logo_url TEXT,
    phone_number TEXT,
    cnpj TEXT,
    ie TEXT,
    subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired')),
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    custom_monthly_price NUMERIC(10, 2),
    custom_quarterly_price NUMERIC(10, 2),
    custom_yearly_price NUMERIC(10, 2),
    last_plan_type TEXT,
    enabled_features JSONB DEFAULT '{"osTab": true, "customersTab": true, "stockTab": true, "salesTab": true, "financeTab": true, "profiles": true, "xmlExportImport": true, "hideFinancialReports": false}',
    max_users INTEGER DEFAULT 999,
    printer_size INTEGER DEFAULT 58,
    retention_months INTEGER DEFAULT 6,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Tabela de Limites por Loja
CREATE TABLE IF NOT EXISTS public.tenant_limits (
    tenant_id TEXT PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
    max_os INTEGER DEFAULT 999,
    max_products INTEGER DEFAULT 999,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Tabela de Usuários / Operadores
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    store_name TEXT,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'colaborador', 'super', 'deleted')),
    photo TEXT,
    specialty TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Tabela de Controle de Telas e Sessões Concorrentes
CREATE TABLE IF NOT EXISTS public.active_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    user_name TEXT,
    user_id TEXT,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_tenant_device UNIQUE (tenant_id, device_id)
);

-- Tabela de Ordens de Serviço (O.S.)
CREATE TABLE IF NOT EXISTS public.service_orders (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    phone_number TEXT,
    address TEXT,
    device_brand TEXT,
    device_model TEXT,
    defect TEXT,
    repair_details TEXT,
    parts_cost NUMERIC(10, 2) DEFAULT 0,
    service_cost NUMERIC(10, 2) DEFAULT 0,
    total NUMERIC(10, 2) DEFAULT 0,
    status TEXT DEFAULT 'Recebido',
    photos TEXT[] DEFAULT '{}',
    finished_photos TEXT[] DEFAULT '{}',
    checklist TEXT[] DEFAULT '{}',
    signature TEXT,
    entry_date TEXT,
    exit_date TEXT,
    part_supplier_id TEXT,
    part_supplier_warranty TEXT,
    customer_id TEXT,
    tracking_token TEXT,
    public_notes TEXT,
    is_tracking_enabled BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Tabela de Produtos do Estoque
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    barcode TEXT,
    photo TEXT,
    cost_price NUMERIC(10, 2) DEFAULT 0,
    sale_price NUMERIC(10, 2) DEFAULT 0,
    quantity INTEGER DEFAULT 0,
    description TEXT,
    additional_photos TEXT[] DEFAULT '{}',
    promotional_price NUMERIC(10, 2) DEFAULT 0,
    is_promotion BOOLEAN DEFAULT false,
    video_url TEXT,
    brand TEXT,
    model TEXT,
    ncm TEXT,
    cest TEXT,
    cfop TEXT,
    discount NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Migrações/compatibilidade caso a tabela products já exista no banco
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_promotion BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS promotional_price NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS additional_photos TEXT[] DEFAULT '{}';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ncm TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cest TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cfop TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS discount NUMERIC(10, 2) DEFAULT 0;

-- Tabela de Histórico de Vendas
CREATE TABLE IF NOT EXISTS public.sales (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    product_id TEXT,
    product_name TEXT,
    date TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    original_price NUMERIC(10, 2) DEFAULT 0,
    discount NUMERIC(10, 2) DEFAULT 0,
    surcharge NUMERIC(10, 2) DEFAULT 0,
    final_price NUMERIC(10, 2) DEFAULT 0,
    cost_at_sale NUMERIC(10, 2) DEFAULT 0,
    cost_per_unit_at_sale NUMERIC(10, 2) DEFAULT 0,
    sale_price_per_unit_at_sale NUMERIC(10, 2) DEFAULT 0,
    payment_method TEXT,
    seller_name TEXT,
    seller_id TEXT,
    transaction_id TEXT,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Tabela de Movimentações Financeiras / Transações
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    type TEXT CHECK (type IN ('entrada', 'saida')) NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    date TEXT NOT NULL,
    category TEXT,
    payment_method TEXT,
    status TEXT DEFAULT 'paid' CHECK (status IN ('pending', 'paid', 'overdue')),
    due_date TEXT,
    installments JSONB,
    recurrence TEXT CHECK (recurrence IN ('monthly', 'yearly')),
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Tabela de Clientes
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone_number TEXT,
    phone TEXT,
    address TEXT,
    document TEXT,
    cpf TEXT,
    email TEXT,
    notes TEXT,
    notes_history JSONB DEFAULT '[]',
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Tabela de Fornecedores
CREATE TABLE IF NOT EXISTS public.suppliers (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Tabela de Armazenamento de Configurações e Dados em Nuvem (JSON Sincronizado)
CREATE TABLE IF NOT EXISTS public.cloud_data (
    tenant_id TEXT NOT NULL,
    store_key TEXT NOT NULL,
    data_json JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (tenant_id, store_key)
);

-- ==============================================================================
-- 3. MÓDULO DE GESTÃO DE FUNCIONÁRIOS, COMISSÕES E METAS
-- ==============================================================================

-- Tabela de Funcionários (RH / Vendedores / Técnicos)
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    cpf TEXT,
    rg TEXT,
    birth_date TEXT,
    address JSONB,
    pix_key TEXT,
    pix_key_type TEXT,
    role TEXT CHECK (role IN ('tecnico', 'vendedor', 'atendente', 'gerente', 'administrador')),
    status TEXT CHECK (status IN ('active', 'inactive', 'deleted')) DEFAULT 'active',
    admission_date DATE DEFAULT CURRENT_DATE,
    photo_url TEXT,
    salary_base NUMERIC(10, 2) DEFAULT 0,
    commission_type TEXT CHECK (commission_type IN ('sales_percent', 'profit_percent', 'service_percent', 'fixed_product', 'mixed')) DEFAULT 'sales_percent',
    default_commission_percent NUMERIC(5, 2) DEFAULT 0,
    service_commission_percent NUMERIC(5, 2) DEFAULT 0,
    goal_monthly NUMERIC(10, 2) DEFAULT 0,
    permissions JSONB DEFAULT '{"open_os": true, "sell": true, "view_finance": false, "edit_price": false, "cancel_sale": false}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Tabela de Regras de Comissão Inteligente
CREATE TABLE IF NOT EXISTS public.commission_rules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT,
    description TEXT,
    target_type TEXT CHECK (target_type IN ('global', 'category', 'product', 'service')),
    target_id TEXT,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    category_name TEXT,
    commission_percent NUMERIC(5, 2) DEFAULT 0,
    fixed_value NUMERIC(10, 2) DEFAULT 0,
    rule_type TEXT CHECK (rule_type IN ('percent', 'fixed')) DEFAULT 'percent',
    calculation_base TEXT CHECK (calculation_base IN ('gross_sale', 'net_profit')) DEFAULT 'gross_sale',
    value NUMERIC(10, 2) DEFAULT 0,
    min_amount NUMERIC(10, 2) DEFAULT 0,
    requires_goal_met BOOLEAN DEFAULT false,
    priority INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Metas e Bônus
CREATE TABLE IF NOT EXISTS public.goal_tiers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    min_amount NUMERIC(10, 2) NOT NULL,
    bonus_percent NUMERIC(5, 2) DEFAULT 0,
    bonus_fixed NUMERIC(10, 2) DEFAULT 0,
    bonus_type TEXT CHECK (bonus_type IN ('percent', 'fixed')) DEFAULT 'percent',
    bonus_value NUMERIC(10, 2) DEFAULT 0,
    calculation_base TEXT CHECK (calculation_base IN ('gross_sale', 'net_profit')) DEFAULT 'gross_sale',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Histórico / Extrato de Comissões
CREATE TABLE IF NOT EXISTS public.commissions_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    origin_type TEXT CHECK (origin_type IN ('sale', 'service_order', 'bonus')),
    origin_id TEXT NOT NULL,
    description TEXT NOT NULL,
    sale_amount NUMERIC(10, 2) DEFAULT 0,
    profit_amount NUMERIC(10, 2) DEFAULT 0,
    commission_amount NUMERIC(10, 2) DEFAULT 0,
    status TEXT CHECK (status IN ('pending', 'paid', 'cancelled')) DEFAULT 'pending',
    payment_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 4. ÍNDICES DE DESEMPENHO E OTIMIZAÇÃO DE BUSCA
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_users_tenant ON public.users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_active_sessions_tenant ON public.active_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_tenant ON public.service_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_tracking ON public.service_orders(tracking_token);
CREATE INDEX IF NOT EXISTS idx_products_tenant ON public.products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_sales_tenant ON public.sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tenant ON public.transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON public.customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON public.suppliers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cloud_data_tenant_key ON public.cloud_data(tenant_id, store_key);
CREATE INDEX IF NOT EXISTS idx_employees_tenant ON public.employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_commission_rules_tenant ON public.commission_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_commissions_log_tenant ON public.commissions_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_commissions_log_employee ON public.commissions_log(employee_id);

-- ==============================================================================
-- 5. POLÍTICAS DE ACESSO E SEGURANÇA (ROW LEVEL SECURITY - RLS)
-- ==============================================================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions_log ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso Total para a API da Aplicação
DROP POLICY IF EXISTS "Acesso Total Tenants" ON public.tenants;
CREATE POLICY "Acesso Total Tenants" ON public.tenants FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso Total Tenant Limits" ON public.tenant_limits;
CREATE POLICY "Acesso Total Tenant Limits" ON public.tenant_limits FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso Total Users" ON public.users;
CREATE POLICY "Acesso Total Users" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso Total Active Sessions" ON public.active_sessions;
CREATE POLICY "Acesso Total Active Sessions" ON public.active_sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso Total Service Orders" ON public.service_orders;
CREATE POLICY "Acesso Total Service Orders" ON public.service_orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso Total Products" ON public.products;
CREATE POLICY "Acesso Total Products" ON public.products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso Total Sales" ON public.sales;
CREATE POLICY "Acesso Total Sales" ON public.sales FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso Total Transactions" ON public.transactions;
CREATE POLICY "Acesso Total Transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso Total Customers" ON public.customers;
CREATE POLICY "Acesso Total Customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso Total Suppliers" ON public.suppliers;
CREATE POLICY "Acesso Total Suppliers" ON public.suppliers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso Total Cloud Data" ON public.cloud_data;
CREATE POLICY "Acesso Total Cloud Data" ON public.cloud_data FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso Total Employees" ON public.employees;
CREATE POLICY "Acesso Total Employees" ON public.employees FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso Total Commission Rules" ON public.commission_rules;
CREATE POLICY "Acesso Total Commission Rules" ON public.commission_rules FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso Total Goal Tiers" ON public.goal_tiers;
CREATE POLICY "Acesso Total Goal Tiers" ON public.goal_tiers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso Total Commissions Log" ON public.commissions_log;
CREATE POLICY "Acesso Total Commissions Log" ON public.commissions_log FOR ALL USING (true) WITH CHECK (true);

-- Notificar PostgREST para recarregar o cache de schema imediatamente
NOTIFY pgrst, 'reload schema';
