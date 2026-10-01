-- SCRIPT DEFINITIVO DE REMOÇÃO DE TRAVAS DE CHAVE ESTRANGEIRA NO SUPABASE
-- Execute este script no SQL Editor do Supabase para desabilitar as restrições rígidas
-- que impedem salvar vendas, comissões ou vincular usuários/vendedores.

-- 1. Remove travas na tabela de vendas (sales)
ALTER TABLE IF EXISTS public.sales 
  DROP CONSTRAINT IF EXISTS sales_seller_id_fkey;

ALTER TABLE IF EXISTS public.sales 
  DROP CONSTRAINT IF EXISTS sales_product_id_fkey;

ALTER TABLE IF EXISTS public.sales 
  ADD COLUMN IF NOT EXISTS seller_id TEXT;

-- 2. Remove travas na tabela de logs de comissão (commissions_log)
ALTER TABLE IF EXISTS public.commissions_log
  DROP CONSTRAINT IF EXISTS commissions_log_employee_id_fkey;

-- 3. Remove travas nas regras e metas de comissão
ALTER TABLE IF EXISTS public.goal_tiers
  DROP CONSTRAINT IF EXISTS goal_tiers_employee_id_fkey;

ALTER TABLE IF EXISTS public.commission_rules
  DROP CONSTRAINT IF EXISTS commission_rules_employee_id_fkey;

-- 4. Remove travas na tabela de funcionários
ALTER TABLE IF EXISTS public.employees
  DROP CONSTRAINT IF EXISTS employees_user_id_fkey;

