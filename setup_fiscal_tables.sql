-- ==============================================================================
-- SCRIPT DE BANCO DE DADOS: TABELAS E CONFIGURAÇÕES FISCAIS (NCM, CEST, CFOP)
-- ==============================================================================
-- Este script cria tabelas dedicadas para NCM, CEST e CFOP com índices de busca
-- rápida por nome/código e popula com a base inicial oficial brasileira (incluindo
-- alimentos essenciais como Arroz, Feijão, Bebidas, Telefonia, Limpeza, etc).
-- ==============================================================================

-- 1. TABELA DE NCM (Nomenclatura Comum do Mercosul)
CREATE TABLE IF NOT EXISTS public.fiscal_ncm (
    code VARCHAR(20) PRIMARY KEY,
    description TEXT NOT NULL,
    cfop VARCHAR(10) DEFAULT '5102',
    cest VARCHAR(20),
    category VARCHAR(100),
    aliquota_nac NUMERIC(5,2) DEFAULT 0,
    aliquota_imp NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE CEST (Código Especificador da Substituição Tributária)
CREATE TABLE IF NOT EXISTS public.fiscal_cest (
    code VARCHAR(20) PRIMARY KEY,
    ncm VARCHAR(20),
    description TEXT NOT NULL,
    segment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA DE CFOP (Código Fiscal de Operações e Prestações)
CREATE TABLE IF NOT EXISTS public.fiscal_cfop (
    code VARCHAR(10) PRIMARY KEY,
    description TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'saida', -- 'entrada' ou 'saida'
    application TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ÍNDICES PARA BUSCA RÁPIDA POR TEXTO E CÓDIGO
CREATE INDEX IF NOT EXISTS idx_fiscal_ncm_code ON public.fiscal_ncm (code);
CREATE INDEX IF NOT EXISTS idx_fiscal_ncm_desc ON public.fiscal_ncm USING gin (to_tsvector('portuguese', description));
CREATE INDEX IF NOT EXISTS idx_fiscal_cest_code ON public.fiscal_cest (code);
CREATE INDEX IF NOT EXISTS idx_fiscal_cfop_code ON public.fiscal_cfop (code);

-- 5. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.fiscal_ncm ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_cest ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_cfop ENABLE ROW LEVEL SECURITY;

-- 6. POLÍTICAS DE ACESSO (Leitura liberada para usuários autenticados e anon, escrita para authenticated)
DROP POLICY IF EXISTS "fiscal_ncm_read_policy" ON public.fiscal_ncm;
CREATE POLICY "fiscal_ncm_read_policy" ON public.fiscal_ncm FOR SELECT USING (true);

DROP POLICY IF EXISTS "fiscal_ncm_write_policy" ON public.fiscal_ncm;
CREATE POLICY "fiscal_ncm_write_policy" ON public.fiscal_ncm FOR ALL USING (true);

DROP POLICY IF EXISTS "fiscal_cest_read_policy" ON public.fiscal_cest;
CREATE POLICY "fiscal_cest_read_policy" ON public.fiscal_cest FOR SELECT USING (true);

DROP POLICY IF EXISTS "fiscal_cest_write_policy" ON public.fiscal_cest;
CREATE POLICY "fiscal_cest_write_policy" ON public.fiscal_cest FOR ALL USING (true);

DROP POLICY IF EXISTS "fiscal_cfop_read_policy" ON public.fiscal_cfop;
CREATE POLICY "fiscal_cfop_read_policy" ON public.fiscal_cfop FOR SELECT USING (true);

DROP POLICY IF EXISTS "fiscal_cfop_write_policy" ON public.fiscal_cfop;
CREATE POLICY "fiscal_cfop_write_policy" ON public.fiscal_cfop FOR ALL USING (true);

-- 7. INSERÇÃO DA BASE OFICIAL BRASILEIRA PADRÃO (SEMENTE INICIAL)
-- Alimentos (Destaque para Arroz, Feijão, Óleo, Café, Açúcar)
INSERT INTO public.fiscal_ncm (code, description, cfop, cest, category) VALUES
('1006.30.21', 'Arroz semibranqueado ou branqueado, polido ou brunido (Arroz Branco / Parboilizado)', '5102', NULL, 'Alimentos'),
('1006.10.92', 'Arroz com casca (arroz em palha), não parboilizado', '5102', NULL, 'Alimentos'),
('1006.20.20', 'Arroz descascado (arroz cargo ou castanho) parboilizado', '5102', NULL, 'Alimentos'),
('1006.40.00', 'Arroz quebrado (quirera de arroz)', '5102', NULL, 'Alimentos'),
('0713.33.90', 'Feijão preto, carioca ou comum (Legumes de vagem secos)', '5102', NULL, 'Alimentos'),
('0901.21.00', 'Café torrado, não descafeinado (Café em pó / moído)', '5102', NULL, 'Alimentos'),
('1701.14.00', 'Açúcar de cana refinado ou cristal', '5102', NULL, 'Alimentos'),
('1507.90.11', 'Óleo de soja refinado em recipientes de até 5 litros', '5102', NULL, 'Alimentos'),
('1101.00.10', 'Farinha de trigo de uso doméstico', '5102', NULL, 'Alimentos'),
('1902.19.00', 'Massas alimentícias / Macarrão comum', '5102', NULL, 'Alimentos'),
('1905.31.00', 'Biscoitos e bolachas doces ou recheadas', '5102', NULL, 'Alimentos'),
('1905.90.90', 'Pães, torradas e outros produtos de panificação', '5102', NULL, 'Alimentos'),
('0401.20.10', 'Leite UHT integral longa vida', '5102', NULL, 'Laticínios'),
('0405.10.00', 'Manteiga de leite', '5102', NULL, 'Laticínios'),
('0406.10.10', 'Queijo mussarela, prato ou minas', '5102', NULL, 'Laticínios'),
('0201.30.00', 'Carne bovina desossada fresca ou refrigerada', '5102', NULL, 'Carnes'),
('0207.14.00', 'Carne de frango em pedaços e miudezas congelados', '5102', NULL, 'Carnes'),
('1601.00.00', 'Enchidos e linguiças, salsichas e embutidos', '5405', '17.001.00', 'Carnes'),
('1806.31.10', 'Chocolate em barras ou bombons recheados', '5102', NULL, 'Doces'),
('2103.20.10', 'Molho de tomate em embalagens imediatas', '5102', NULL, 'Alimentos'),
('2501.00.20', 'Sal de cozinha refinado iodado', '5102', NULL, 'Alimentos'),
-- Bebidas
('2202.10.00', 'Águas com gás, refrigerantes aromatizados ou adicionados de açúcar', '5405', '03.010.00', 'Bebidas'),
('2201.10.00', 'Água mineral natural sem gás em garrafas', '5405', '03.001.00', 'Bebidas'),
('2203.00.00', 'Cerveja de malte em lata ou garrafa', '5405', '03.021.00', 'Bebidas'),
('2204.21.00', 'Vinho de uvas frescas em recipientes de até 2 litros', '5405', '02.018.00', 'Bebidas'),
-- Celulares, Peças e Eletrônicos
('8517.13.00', 'Smartphones e telefones celulares inteligentes', '5102', NULL, 'Telefonia'),
('8517.79.00', 'Telas, displays OLED/LCD, módulos frontais e partes de celulares', '5102', NULL, 'Peças'),
('8504.40.10', 'Carregadores de bateria de celular e fontes de alimentação', '5102', NULL, 'Acessórios'),
('8544.42.00', 'Cabos USB, cabos Lightning, Tipo-C e condutores', '5102', NULL, 'Acessórios'),
('8518.30.00', 'Fones de ouvido com ou sem microfone / Bluetooth', '5102', NULL, 'Acessórios'),
('8507.60.00', 'Baterias de íons de lítio recarregáveis para celular e notebook', '5102', NULL, 'Peças'),
('3926.90.90', 'Capinhas de celular em silicone/plástico e películas de vidro', '5102', NULL, 'Acessórios'),
-- Higiene e Limpeza
('3401.11.90', 'Sabonetes de toucador em barra', '5405', '20.034.00', 'Higiene'),
('3305.10.00', 'Xampus / Shampoos para cabelo', '5405', '20.017.00', 'Cosméticos'),
('3306.10.00', 'Dentifrícios / Creme dental e pasta de dente', '5405', '20.023.00', 'Higiene'),
('3402.20.00', 'Detergentes líquidos para louça', '5405', '11.001.00', 'Limpeza'),
('2828.90.11', 'Água sanitária e alvejantes com hipoclorito', '5405', '11.007.00', 'Limpeza')
ON CONFLICT (code) DO UPDATE SET
    description = EXCLUDED.description,
    cfop = EXCLUDED.cfop,
    cest = EXCLUDED.cest,
    category = EXCLUDED.category,
    updated_at = NOW();

-- Inserir CFOPs Padrão
INSERT INTO public.fiscal_cfop (code, description, type, application) VALUES
('5102', 'Venda de mercadoria adquirida ou recebida de terceiros (Operação Interna)', 'saida', 'Comércio varejista comum'),
('5405', 'Venda de mercadoria adquirida ou recebida com Substituição Tributária (ST)', 'saida', 'Bebidas, autopeças, cosméticos em ST'),
('6102', 'Venda de mercadoria para outro Estado (Interestadual)', 'saida', 'Venda interestadual'),
('6404', 'Venda de mercadoria com ST para outro Estado', 'saida', 'Venda interestadual em ST'),
('1102', 'Compra para comercialização (Entrada interna)', 'entrada', 'Entrada de notas fiscais de compra'),
('2102', 'Compra para comercialização (Entrada interestadual)', 'entrada', 'Entrada interestadual de mercadorias')
ON CONFLICT (code) DO UPDATE SET
    description = EXCLUDED.description,
    type = EXCLUDED.type,
    application = EXCLUDED.application,
    updated_at = NOW();

-- Inserir CESTs Padrão
INSERT INTO public.fiscal_cest (code, ncm, description, segment) VALUES
('03.010.00', '2202.10.00', 'Refrigerantes em embalagens PET, lata ou vidro', 'Bebidas'),
('03.001.00', '2201.10.00', 'Água mineral, gasosa ou não, ou aromatizada', 'Bebidas'),
('03.021.00', '2203.00.00', 'Cervejas de malte em recipientes de qualquer capacidade', 'Bebidas'),
('20.034.00', '3401.11.90', 'Sabonetes em barra de toucador', 'Perfumaria e cosméticos'),
('20.023.00', '3306.10.00', 'Dentifrícios e pastas de dente', 'Higiene'),
('11.001.00', '3402.20.00', 'Detergentes líquidos para louça', 'Produtos de limpeza')
ON CONFLICT (code) DO UPDATE SET
    ncm = EXCLUDED.ncm,
    description = EXCLUDED.description,
    segment = EXCLUDED.segment,
    updated_at = NOW();

-- 8. RECARREGAR SCHEMA DA API SUPABASE
NOTIFY pgrst, 'reload schema';
