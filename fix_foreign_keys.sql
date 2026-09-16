-- SCRIPT DE CORREÇÃO DE CHAVES ESTRANGEIRAS E INTEGRIDADE REFERENCIAL
-- Execute este script no SQL Editor do Supabase para adicionar ON DELETE CASCADE
-- nas tabelas de funcionários, usuários e comissões.

-- 1. Garante que se o usuário for excluído, os registros de employees correspondentes também sejam excluídos em cascata
ALTER TABLE IF EXISTS public.employees
  DROP CONSTRAINT IF EXISTS employees_user_id_fkey;

ALTER TABLE IF EXISTS public.employees
  ADD CONSTRAINT employees_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE CASCADE;

-- 2. Garante que se o funcionário for excluído, os logs de comissão sejam excluídos em cascata
ALTER TABLE IF EXISTS public.commissions_log
  DROP CONSTRAINT IF EXISTS commissions_log_employee_id_fkey;

ALTER TABLE IF EXISTS public.commissions_log
  ADD CONSTRAINT commissions_log_employee_id_fkey
  FOREIGN KEY (employee_id)
  REFERENCES public.employees(id)
  ON DELETE CASCADE;

-- 3. Garante que se o funcionário for excluído, as regras e metas sejam excluídas em cascata
ALTER TABLE IF EXISTS public.goal_tiers
  DROP CONSTRAINT IF EXISTS goal_tiers_employee_id_fkey;

ALTER TABLE IF EXISTS public.goal_tiers
  ADD CONSTRAINT goal_tiers_employee_id_fkey
  FOREIGN KEY (employee_id)
  REFERENCES public.employees(id)
  ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.commission_rules
  DROP CONSTRAINT IF EXISTS commission_rules_employee_id_fkey;

ALTER TABLE IF EXISTS public.commission_rules
  ADD CONSTRAINT commission_rules_employee_id_fkey
  FOREIGN KEY (employee_id)
  REFERENCES public.employees(id)
  ON DELETE CASCADE;
