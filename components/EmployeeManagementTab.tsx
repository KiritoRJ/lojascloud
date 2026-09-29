import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, Plus, Edit2, Trash2, DollarSign, TrendingUp, Award, Shield, Save, X, Search, 
  ChevronRight, Briefcase, Percent, BarChart3, PieChart, Settings, Target, Zap, Filter, 
  CheckCircle2, AlertCircle, Users, Menu, FileText, Eye, EyeOff, Copy, Check, Calendar,
  Clock, HelpCircle, ArrowUpRight, Wrench, Smartphone, Tag, RefreshCw
} from 'lucide-react';
import { OnlineDB, supabase } from '../utils/api';
import { Employee, CommissionRule, CommissionLog, GoalTier, Product, Sale, ServiceOrder, User as UserType } from '../types';
import { formatCurrency, formatDate, formatDateTime } from '../utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, Cell } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO, startOfDay, endOfDay, subMonths, subDays, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tooltip } from './reseller/Tooltip';

interface Props {
  tenantId: string;
  sales?: Sale[];
  serviceOrders?: ServiceOrder[];
  products?: Product[];
  currentUser?: UserType | null;
}

interface UnifiedCommissionEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  originType: 'sale' | 'service_order' | 'bonus';
  originId: string;
  description: string;
  saleAmount: number;
  profitAmount: number;
  commissionPercent: number;
  commissionAmount: number;
  status: 'pending' | 'paid' | 'cancelled';
  date: string;
  paymentMethod?: string;
  customerName?: string;
}

export const EmployeeManagementTab: React.FC<Props> = ({ 
  tenantId, 
  sales = [], 
  serviceOrders = [], 
  products = [], 
  currentUser 
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'employees' | 'commissions' | 'rules'>('dashboard');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [goalTiers, setGoalTiers] = useState<GoalTier[]>([]);
  const [dbLogs, setDbLogs] = useState<CommissionLog[]>([]);
  const [fetchedSales, setFetchedSales] = useState<Sale[]>([]);
  const [fetchedOrders, setFetchedOrders] = useState<ServiceOrder[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [commissionStatusFilter, setCommissionStatusFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [copiedPixId, setCopiedPixId] = useState<string | null>(null);

  // Período Selecionado
  const [periodPreset, setPeriodPreset] = useState<'this_month' | 'last_month' | 'last_7_days' | 'this_year' | 'custom'>('this_month');
  const [periodStart, setPeriodStart] = useState<Date>(startOfMonth(new Date()));
  const [periodEnd, setPeriodEnd] = useState<Date>(endOfMonth(new Date()));

  // Modais
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editingRule, setEditingRule] = useState<CommissionRule | null>(null);
  const [editingGoal, setEditingGoal] = useState<GoalTier | null>(null);
  const [visibleItemsCount, setVisibleItemsCount] = useState(15);

  // Form State: Funcionário / Colaborador
  const [employeeFormData, setEmployeeFormData] = useState<Partial<Employee>>({
    name: '',
    email: '',
    phone: '',
    role: 'vendedor',
    status: 'active',
    admissionDate: new Date().toISOString().split('T')[0],
    salaryBase: 0,
    commissionType: 'sales_percent',
    defaultCommissionPercent: 5,
    serviceCommissionPercent: 10,
    goalMonthly: 10000,
    pixKey: '',
    pixKeyType: 'cpf',
    permissions: { open_os: true, sell: true, view_finance: false, edit_price: false, cancel_sale: false }
  });

  // Form State: Regra de Comissão
  const [ruleFormData, setRuleFormData] = useState<Partial<CommissionRule>>({
    name: '',
    description: '',
    targetType: 'global',
    ruleType: 'percent',
    calculationBase: 'gross_sale',
    value: 5,
    priority: 1,
    isActive: true,
    requiresGoalMet: false
  });

  // Form State: Meta / Bônus
  const [goalFormData, setGoalFormData] = useState<Partial<GoalTier>>({
    name: '',
    bonusType: 'fixed',
    calculationBase: 'gross_sale',
    minAmount: 15000,
    bonusValue: 300
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Preset de datas
  const handleSelectPreset = (preset: 'this_month' | 'last_month' | 'last_7_days' | 'this_year' | 'custom') => {
    setPeriodPreset(preset);
    const now = new Date();
    if (preset === 'this_month') {
      setPeriodStart(startOfMonth(now));
      setPeriodEnd(endOfMonth(now));
    } else if (preset === 'last_month') {
      const prev = subMonths(now, 1);
      setPeriodStart(startOfMonth(prev));
      setPeriodEnd(endOfMonth(prev));
    } else if (preset === 'last_7_days') {
      setPeriodStart(startOfDay(subDays(now, 7)));
      setPeriodEnd(endOfDay(now));
    } else if (preset === 'this_year') {
      setPeriodStart(startOfYear(now));
      setPeriodEnd(endOfYear(now));
    }
  };

  // Carrega todos os dados do banco
  const loadData = async () => {
    if (!tenantId) return;
    setIsLoading(true);
    try {
      const [emps, rls, lgs, tiers, prods, sls, ords] = await Promise.all([
        OnlineDB.fetchEmployees(tenantId),
        OnlineDB.fetchCommissionRules(tenantId),
        OnlineDB.fetchCommissionLogs(tenantId),
        OnlineDB.fetchGoalTiers(tenantId),
        OnlineDB.fetchProducts(tenantId),
        OnlineDB.fetchSales(tenantId),
        OnlineDB.fetchServiceOrders(tenantId)
      ]);

      setEmployees(emps || []);
      setRules(rls || []);
      setDbLogs(lgs || []);
      setGoalTiers(tiers || []);
      setFetchedSales(sls || []);
      setFetchedOrders(ords || []);

      const allProds = prods || products;
      const cats = Array.from(new Set(allProds.map(p => (p as any).category).filter(Boolean))) as string[];
      setCategories(cats);
    } catch (err) {
      console.warn('Erro ao carregar dados da equipe:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenantId]);

  // Listener realtime do Supabase para novas vendas / comissões
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel(`tenant-${tenantId}-team-realtime`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'commissions_log', filter: `tenant_id=eq.${tenantId}` },
        () => loadData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'employees', filter: `tenant_id=eq.${tenantId}` },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  // Fonte unificada de vendas e ordens de serviço (usa props se disponível ou fetched)
  const currentSales = useMemo(() => {
    return sales && sales.length > 0 ? sales : fetchedSales;
  }, [sales, fetchedSales]);

  const currentOrders = useMemo(() => {
    return serviceOrders && serviceOrders.length > 0 ? serviceOrders : fetchedOrders;
  }, [serviceOrders, fetchedOrders]);

  // ==========================================================================
  // MOTOR UNIFICADO DE CÁLCULO DE COMISSÕES E VENDAS EM TEMPO REAL
  // ==========================================================================
  const unifiedEntries = useMemo(() => {
    const entries: UnifiedCommissionEntry[] = [];
    const activeRules = rules.filter(r => r.isActive);

    // Mapeamento de status de logs do banco de dados (para saber se já foi marcado como 'paid')
    const logStatusMap = new Map<string, 'pending' | 'paid' | 'cancelled'>();
    dbLogs.forEach(l => {
      if (l.originId) {
        logStatusMap.set(`${l.originType}_${l.originId}`, l.status);
      }
    });

    // 1. Processa todas as VENDAS do período
    currentSales.forEach(sale => {
      if (sale.isDeleted) return;
      if (!sale.date) return;

      const saleDate = parseISO(sale.date);
      if (!isWithinInterval(saleDate, { start: startOfDay(periodStart), end: endOfDay(periodEnd) })) {
        return;
      }

      // Encontra o colaborador vinculado à venda
      const emp = employees.find(e => 
        (sale.sellerId && (e.id === sale.sellerId || e.userId === sale.sellerId)) ||
        (sale.sellerName && e.name.toLowerCase() === sale.sellerName.toLowerCase()) ||
        (sale.sellerName && e.email && e.email.toLowerCase() === sale.sellerName.toLowerCase())
      );

      if (!emp) return;

      const saleAmount = Number(sale.finalPrice || sale.total || 0);
      const costAmount = Number(sale.costAtSale || 0);
      const profitAmount = Math.max(0, saleAmount - costAmount);

      // Aplica regras de comissão específicas ou padrão do funcionário
      let calculatedCommission = 0;
      let appliedPercent = Number(emp.defaultCommissionPercent || 5);

      const matchedRule = activeRules
        .filter(r => {
          if (r.employeeId && r.employeeId !== emp.id) return false;
          if (r.minAmount && saleAmount < r.minAmount) return false;
          if (r.targetType === 'product' && r.targetId === sale.productId) return true;
          if (r.targetType === 'category' && r.targetId === sale.category) return true;
          if (r.targetType === 'global') return true;
          return false;
        })
        .sort((a, b) => b.priority - a.priority)[0];

      if (matchedRule) {
        const base = matchedRule.calculationBase === 'net_profit' ? profitAmount : saleAmount;
        if (matchedRule.ruleType === 'percent') {
          calculatedCommission = base * (matchedRule.value / 100);
          appliedPercent = matchedRule.value;
        } else {
          calculatedCommission = matchedRule.value;
          appliedPercent = saleAmount > 0 ? (matchedRule.value / saleAmount) * 100 : 0;
        }
      } else {
        const base = emp.commissionType === 'profit_percent' ? profitAmount : saleAmount;
        appliedPercent = Number(emp.defaultCommissionPercent || 5);
        calculatedCommission = base * (appliedPercent / 100);
      }

      const status = logStatusMap.get(`sale_${sale.id}`) || 'pending';

      entries.push({
        id: `sale_${sale.id}`,
        employeeId: emp.id,
        employeeName: emp.name,
        originType: 'sale',
        originId: sale.id,
        description: `Venda: ${sale.productName || 'Produto'} (Qtd: ${sale.quantity || 1})`,
        saleAmount,
        profitAmount,
        commissionPercent: appliedPercent,
        commissionAmount: calculatedCommission,
        status,
        date: sale.date,
        paymentMethod: sale.paymentMethod,
        customerName: sale.customerName
      });
    });

    // 2. Processa todas as ORDENS DE SERVIÇO do período
    currentOrders.forEach(order => {
      if (order.isDeleted) return;
      const isCompleted = order.status === 'Entregue' || order.status === 'Concluído';
      if (!isCompleted) return;

      const orderDateStr = order.exitDate || order.date || order.entryDate;
      if (!orderDateStr) return;

      let orderDate: Date;
      try {
        orderDate = parseISO(orderDateStr);
        if (isNaN(orderDate.getTime())) {
          orderDate = new Date();
        }
      } catch {
        orderDate = new Date();
      }

      if (!isWithinInterval(orderDate, { start: startOfDay(periodStart), end: endOfDay(periodEnd) })) {
        return;
      }

      const emp = employees.find(e => 
        (order.technicianId && (e.id === order.technicianId || e.userId === order.technicianId)) ||
        (order.sellerId && (e.id === order.sellerId || e.userId === order.sellerId))
      );

      if (!emp) return;

      const totalAmount = Number(order.total || 0);
      const partsCost = Number(order.partsCost || 0);
      const profitAmount = Math.max(0, totalAmount - partsCost);

      const appliedPercent = Number(emp.serviceCommissionPercent || emp.defaultCommissionPercent || 10);
      const calculatedCommission = totalAmount * (appliedPercent / 100);

      const status = logStatusMap.get(`service_order_${order.id}`) || 'pending';

      entries.push({
        id: `service_order_${order.id}`,
        employeeId: emp.id,
        employeeName: emp.name,
        originType: 'service_order',
        originId: String(order.id),
        description: `O.S. #${order.id} - ${order.deviceModel || order.deviceBrand || 'Serviço'}`,
        saleAmount: totalAmount,
        profitAmount,
        commissionPercent: appliedPercent,
        commissionAmount: calculatedCommission,
        status,
        date: orderDateStr,
        customerName: order.customerName
      });
    });

    // 3. Adiciona registros manuais de Bônus da tabela commissions_log
    dbLogs.forEach(log => {
      if (log.originType === 'bonus' && log.status !== 'cancelled') {
        const logDate = parseISO(log.createdAt);
        if (isWithinInterval(logDate, { start: startOfDay(periodStart), end: endOfDay(periodEnd) })) {
          const emp = employees.find(e => e.id === log.employeeId);
          if (emp) {
            entries.push({
              id: log.id,
              employeeId: emp.id,
              employeeName: emp.name,
              originType: 'bonus',
              originId: log.originId || log.id,
              description: log.description || 'Bônus por Meta Atingida',
              saleAmount: Number(log.saleAmount || 0),
              profitAmount: Number(log.profitAmount || 0),
              commissionPercent: 100,
              commissionAmount: Number(log.commissionAmount || 0),
              status: log.status,
              date: log.createdAt
            });
          }
        }
      }
    });

    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [currentSales, currentOrders, dbLogs, employees, rules, periodStart, periodEnd]);

  // Estatísticas calculadas por colaborador
  const employeePerformance = useMemo(() => {
    return employees.map(emp => {
      const empEntries = unifiedEntries.filter(e => e.employeeId === emp.id);
      const totalSales = empEntries.reduce((acc, curr) => acc + curr.saleAmount, 0);
      const totalProfit = empEntries.reduce((acc, curr) => acc + curr.profitAmount, 0);
      const totalCommission = empEntries.reduce((acc, curr) => acc + curr.commissionAmount, 0);
      const paidCommission = empEntries.filter(e => e.status === 'paid').reduce((acc, curr) => acc + curr.commissionAmount, 0);
      const pendingCommission = empEntries.filter(e => e.status !== 'paid').reduce((acc, curr) => acc + curr.commissionAmount, 0);
      const salesCount = empEntries.filter(e => e.originType === 'sale').length;
      const osCount = empEntries.filter(e => e.originType === 'service_order').length;

      const goal = Number(emp.goalMonthly || 0);
      const progress = goal > 0 ? (totalSales / goal) * 100 : 0;
      const isGoalMet = goal > 0 && totalSales >= goal;

      return {
        ...emp,
        totalSales,
        totalProfit,
        totalCommission,
        paidCommission,
        pendingCommission,
        salesCount,
        osCount,
        progress,
        isGoalMet
      };
    }).sort((a, b) => b.totalSales - a.totalSales);
  }, [employees, unifiedEntries]);

  // Totais Gerais do Dashboard
  const summaryKPIs = useMemo(() => {
    const totalTeamSales = unifiedEntries.reduce((acc, e) => acc + e.saleAmount, 0);
    const totalTeamCommission = unifiedEntries.reduce((acc, e) => acc + e.commissionAmount, 0);
    const totalTeamProfit = unifiedEntries.reduce((acc, e) => acc + e.profitAmount, 0);
    const pendingPayouts = unifiedEntries.filter(e => e.status !== 'paid').reduce((acc, e) => acc + e.commissionAmount, 0);
    const topSeller = employeePerformance[0] || null;
    const totalTeamGoal = employees.reduce((acc, emp) => acc + Number(emp.goalMonthly || 0), 0);
    const teamProgress = totalTeamGoal > 0 ? (totalTeamSales / totalTeamGoal) * 100 : 0;

    return {
      totalTeamSales,
      totalTeamCommission,
      totalTeamProfit,
      pendingPayouts,
      topSeller,
      totalTeamGoal,
      teamProgress
    };
  }, [unifiedEntries, employeePerformance, employees]);

  // Entradas filtradas para a tabela de comissões
  const filteredCommissionEntries = useMemo(() => {
    return unifiedEntries.filter(entry => {
      if (selectedEmployeeId !== 'all' && entry.employeeId !== selectedEmployeeId) return false;
      if (commissionStatusFilter !== 'all' && entry.status !== commissionStatusFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          entry.description.toLowerCase().includes(term) ||
          entry.employeeName.toLowerCase().includes(term) ||
          (entry.customerName && entry.customerName.toLowerCase().includes(term))
        );
      }
      return true;
    });
  }, [unifiedEntries, selectedEmployeeId, commissionStatusFilter, searchTerm]);

  // Ação: Marcar Comissão como Paga / Pendente
  const handleToggleCommissionStatus = async (entry: UnifiedCommissionEntry) => {
    const nextStatus = entry.status === 'paid' ? 'pending' : 'paid';
    setIsSaving(true);
    try {
      await OnlineDB.logCommission(tenantId, {
        employeeId: entry.employeeId,
        originType: entry.originType,
        originId: entry.originId,
        description: entry.description,
        saleAmount: entry.saleAmount,
        profitAmount: entry.profitAmount,
        commissionAmount: entry.commissionAmount,
        status: nextStatus,
        paymentDate: nextStatus === 'paid' ? new Date().toISOString() : undefined
      });

      showToast(`Comissão marcada como ${nextStatus === 'paid' ? 'PAGA' : 'PENDENTE'} com sucesso!`);
      await loadData();
    } catch (err: any) {
      showToast('Erro ao atualizar status da comissão.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Ação: Salvar Colaborador (Criar ou Editar)
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeFormData.name?.trim()) {
      showToast('Informe o nome do colaborador.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        ...employeeFormData,
        id: editingEmployee ? editingEmployee.id : `emp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        tenantId,
        name: employeeFormData.name.trim(),
        salaryBase: Number(employeeFormData.salaryBase) || 0,
        defaultCommissionPercent: Number(employeeFormData.defaultCommissionPercent) || 0,
        serviceCommissionPercent: Number(employeeFormData.serviceCommissionPercent) || 0,
        goalMonthly: Number(employeeFormData.goalMonthly) || 0
      };

      const res = await OnlineDB.upsertEmployee(tenantId, payload);
      if (res.success) {
        showToast(editingEmployee ? 'Colaborador atualizado com sucesso!' : 'Novo colaborador cadastrado com sucesso!');
        setIsEmployeeModalOpen(false);
        setEditingEmployee(null);
        await loadData();
      } else {
        showToast(res.message || 'Erro ao salvar colaborador.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar colaborador.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Ação: Excluir Colaborador
  const handleDeleteEmployee = async (emp: Employee) => {
    if (!window.confirm(`Deseja realmente remover o colaborador "${emp.name}"? As vendas históricas permanecerão registradas.`)) {
      return;
    }

    setIsSaving(true);
    try {
      const res = await OnlineDB.deleteEmployee(emp.id);
      if (res.success) {
        showToast(`Colaborador "${emp.name}" removido com sucesso.`);
        await loadData();
      } else {
        showToast(res.message || 'Erro ao excluir colaborador.', 'error');
      }
    } catch (err: any) {
      showToast('Erro ao excluir colaborador.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Ação: Copiar Chave Pix
  const handleCopyPix = (key: string, id: string) => {
    if (!key) return;
    navigator.clipboard.writeText(key);
    setCopiedPixId(id);
    showToast('Chave Pix copiada para a área de transferência!');
    setTimeout(() => setCopiedPixId(null), 3000);
  };

  // Ação: Salvar Regra de Comissão
  const handleSaveRule = async () => {
    if (!ruleFormData.name?.trim()) {
      showToast('Informe o nome da regra.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const res = await OnlineDB.upsertCommissionRule(tenantId, {
        ...ruleFormData,
        value: Number(ruleFormData.value) || 0,
        priority: Number(ruleFormData.priority) || 1
      });
      if (res.success) {
        showToast('Regra de comissão salva com sucesso!');
        setIsRuleModalOpen(false);
        setEditingRule(null);
        await loadData();
      } else {
        showToast(res.message || 'Erro ao salvar regra.', 'error');
      }
    } catch (err: any) {
      showToast('Erro ao salvar regra.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Ação: Excluir Regra
  const handleDeleteRule = async (id: string) => {
    if (!window.confirm('Deseja excluir esta regra de comissão?')) return;
    setIsSaving(true);
    try {
      await OnlineDB.deleteCommissionRule(id);
      showToast('Regra excluída.');
      await loadData();
    } catch (e) {
      showToast('Erro ao excluir regra.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Ação: Salvar Meta / Bônus
  const handleSaveGoal = async () => {
    if (!goalFormData.name?.trim()) {
      showToast('Informe o nome do bônus.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const res = await OnlineDB.upsertGoalTier(tenantId, {
        ...goalFormData,
        minAmount: Number(goalFormData.minAmount) || 0,
        bonusValue: Number(goalFormData.bonusValue) || 0
      });
      if (res.success) {
        showToast('Bônus por meta salvo com sucesso!');
        setIsGoalModalOpen(false);
        setEditingGoal(null);
        await loadData();
      } else {
        showToast(res.message || 'Erro ao salvar bônus.', 'error');
      }
    } catch (err: any) {
      showToast('Erro ao salvar meta.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Ação: Excluir Meta
  const handleDeleteGoal = async (id: string) => {
    if (!window.confirm('Deseja excluir este bônus de meta?')) return;
    setIsSaving(true);
    try {
      await OnlineDB.deleteGoalTier(id);
      showToast('Bônus excluído.');
      await loadData();
    } catch (e) {
      showToast('Erro ao excluir bônus.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Ação: Exportar PDF do Extrato
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório de Vendas e Comissões da Equipe', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Período: ${periodStart.toLocaleDateString('pt-BR')} até ${periodEnd.toLocaleDateString('pt-BR')}`, 14, 28);
    doc.text(`Emissão: ${new Date().toLocaleString('pt-BR')}`, 14, 34);

    const tableRows = filteredCommissionEntries.map(e => [
      formatDate(e.date),
      e.employeeName,
      e.description,
      e.originType === 'sale' ? 'Venda PDV' : e.originType === 'service_order' ? 'Ordem de Serviço' : 'Bônus',
      formatCurrency(e.saleAmount),
      `${e.commissionPercent.toFixed(1)}%`,
      formatCurrency(e.commissionAmount),
      e.status === 'paid' ? 'PAGO' : 'PENDENTE'
    ]);

    autoTable(doc, {
      startY: 42,
      head: [['Data', 'Vendedor', 'Descrição', 'Tipo', 'Valor Venda', '% Comis.', 'Comissão', 'Status']],
      body: tableRows,
      headStyles: { fillColor: [15, 23, 42] },
      styles: { fontSize: 8 }
    });

    doc.save(`relatorio-comissoes-equipe-${tenantId}.pdf`);
    showToast('Relatório em PDF gerado com sucesso!');
  };

  const openNewEmployeeModal = () => {
    setEditingEmployee(null);
    setEmployeeFormData({
      name: '',
      email: '',
      phone: '',
      role: 'vendedor',
      status: 'active',
      admissionDate: new Date().toISOString().split('T')[0],
      salaryBase: 0,
      commissionType: 'sales_percent',
      defaultCommissionPercent: 5,
      serviceCommissionPercent: 10,
      goalMonthly: 10000,
      pixKey: '',
      pixKeyType: 'cpf',
      permissions: { open_os: true, sell: true, view_finance: false, edit_price: false, cancel_sale: false }
    });
    setIsEmployeeModalOpen(true);
  };

  const openEditEmployeeModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmployeeFormData({
      ...emp,
      defaultCommissionPercent: emp.defaultCommissionPercent ?? 5,
      serviceCommissionPercent: emp.serviceCommissionPercent ?? 10,
      commissionType: emp.commissionType ?? 'sales_percent',
      goalMonthly: emp.goalMonthly ?? 10000
    });
    setIsEmployeeModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-24 font-sans animate-in fade-in duration-300">
      
      {/* TOAST FEEDBACK */}
      {toastMessage && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border text-xs font-black uppercase tracking-wider backdrop-blur-md animate-in slide-in-from-top-3 ${
          toastMessage.type === 'error'
            ? 'bg-red-950/90 text-red-200 border-red-800/80 shadow-red-950/40'
            : 'bg-emerald-950/90 text-emerald-200 border-emerald-800/80 shadow-emerald-950/40'
        }`}>
          {toastMessage.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* ====================================================================== */}
      {/* CABEÇALHO PRINCIPAL DA ABA EQUIPE                                       */}
      {/* ====================================================================== */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0">
            <Users size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Gestão da Equipe & Comissões</h1>
              <span className="bg-blue-50 text-blue-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-blue-100">
                {employees.length} Colaboradores
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Controle vendas por vendedor, cálculo automático de comissões, metas mensais e repasses via Pix.
            </p>
          </div>
        </div>

        {/* Botão Novo Colaborador */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Tooltip content="Clique para cadastrar um novo vendedor, atendente ou técnico com suas porcentagens de comissão e chave Pix.">
            <button
              type="button"
              onClick={openNewEmployeeModal}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95 transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>Novo Colaborador</span>
            </button>
          </Tooltip>

          <Tooltip content="Recarrega as vendas e comissões atualizadas em tempo real.">
            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* ====================================================================== */}
      {/* FILTRO RÁPIDO DE PERÍODO (PRESETS + DATEPICKER)                        */}
      {/* ====================================================================== */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-x-auto">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Calendar size={12} /> Período:
          </span>
          {[
            { id: 'this_month', label: 'Este Mês' },
            { id: 'last_month', label: 'Mês Passado' },
            { id: 'last_7_days', label: 'Últimos 7 Dias' },
            { id: 'this_year', label: 'Ano Atual' }
          ].map(p => (
            <Tooltip key={p.id} content={`Filtrar vendas e comissões para o período: ${p.label}`}>
              <button
                type="button"
                onClick={() => handleSelectPreset(p.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  periodPreset === p.id 
                    ? 'bg-slate-900 text-white shadow-xs' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {p.label}
              </button>
            </Tooltip>
          ))}
        </div>

        {/* Datepicker customizado */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl self-start sm:self-auto">
          <DatePicker
            selected={periodStart}
            onChange={(date) => {
              if (date) {
                setPeriodStart(date);
                setPeriodPreset('custom');
              }
            }}
            selectsStart
            startDate={periodStart}
            endDate={periodEnd}
            dateFormat="dd/MM/yyyy"
            locale={ptBR}
            className="w-20 bg-transparent text-xs font-black text-slate-800 text-center outline-none cursor-pointer"
          />
          <span className="text-slate-400 font-bold text-xs">até</span>
          <DatePicker
            selected={periodEnd}
            onChange={(date) => {
              if (date) {
                setPeriodEnd(date);
                setPeriodPreset('custom');
              }
            }}
            selectsEnd
            startDate={periodStart}
            endDate={periodEnd}
            minDate={periodStart}
            dateFormat="dd/MM/yyyy"
            locale={ptBR}
            className="w-20 bg-transparent text-xs font-black text-slate-800 text-center outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* ====================================================================== */}
      {/* 4 CARDS RESUMO DE MÉTRICAS (KPIs)                                      */}
      {/* ====================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Total Vendido pela Equipe */}
        <Tooltip content="Soma de todas as vendas e ordens de serviço realizadas pelos colaboradores neste período selecionado.">
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between h-full group hover:border-blue-300 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Faturado Equipe</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Briefcase size={16} />
              </div>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 tracking-tight">{formatCurrency(summaryKPIs.totalTeamSales)}</p>
              <p className="text-[11px] text-slate-500 font-medium mt-1">
                {unifiedEntries.length} operações realizadas
              </p>
            </div>
          </div>
        </Tooltip>

        {/* Total de Comissões a Pagar */}
        <Tooltip content="Valor total de comissões acumuladas pelos vendedores e técnicos neste período com base nas porcentagens configuradas.">
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between h-full group hover:border-emerald-300 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Comissões a Pagar</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign size={16} />
              </div>
            </div>
            <div>
              <p className="text-2xl font-black text-emerald-600 tracking-tight">{formatCurrency(summaryKPIs.totalTeamCommission)}</p>
              <p className="text-[11px] text-amber-600 font-bold mt-1">
                Pendente: {formatCurrency(summaryKPIs.pendingPayouts)}
              </p>
            </div>
          </div>
        </Tooltip>

        {/* Campeão de Vendas */}
        <Tooltip content="Colaborador que gerou o maior volume de vendas e serviços para a loja no período.">
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between h-full group hover:border-amber-300 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 flex items-center gap-1">
                <Award size={12} /> Campeão do Mês
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                <Award size={16} />
              </div>
            </div>
            <div>
              <p className="text-lg font-black text-slate-900 truncate">
                {summaryKPIs.topSeller?.name || 'Nenhum'}
              </p>
              <p className="text-[11px] text-emerald-600 font-bold mt-1">
                {summaryKPIs.topSeller ? formatCurrency(summaryKPIs.topSeller.totalSales) : 'R$ 0,00'}
              </p>
            </div>
          </div>
        </Tooltip>

        {/* Meta Geral da Equipe */}
        <Tooltip content="Progresso da equipe em relação à soma das metas individuais de todos os colaboradores.">
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between h-full group hover:border-purple-300 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-600">Meta da Loja</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Target size={16} />
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <p className="text-xl font-black text-slate-900">{summaryKPIs.teamProgress.toFixed(0)}%</p>
                <span className="text-[10px] text-slate-400 font-bold">de {formatCurrency(summaryKPIs.totalTeamGoal)}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-700 ${summaryKPIs.teamProgress >= 100 ? 'bg-emerald-500' : 'bg-purple-600'}`}
                  style={{ width: `${Math.min(summaryKPIs.teamProgress, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </Tooltip>

      </div>

      {/* ====================================================================== */}
      {/* BARRA DE NAVEGAÇÃO ENTRE AS ABAS                                       */}
      {/* ====================================================================== */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1 overflow-x-auto">
        {[
          { id: 'dashboard', label: 'Desempenho & Metas', icon: BarChart3 },
          { id: 'employees', label: `Colaboradores (${employees.length})`, icon: Users },
          { id: 'commissions', label: `Extrato de Comissões (${unifiedEntries.length})`, icon: DollarSign },
          { id: 'rules', label: `Regras & Bônus (${rules.length + goalTiers.length})`, icon: Percent }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <tab.icon size={15} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ====================================================================== */}
      {/* ABA 1: DASHBOARD & DESEMPENHO DA EQUIPE                                */}
      {/* ====================================================================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in">
          
          {/* Ranking e Gráfico */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            
            {/* Pódio / Ranking dos Melhores Vendedores */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4 lg:col-span-1">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
                    <Award size={16} className="text-amber-500" />
                    Ranking da Equipe
                  </h3>
                  <p className="text-[11px] text-slate-400">Classificação por faturamento gerado</p>
                </div>
              </div>

              <div className="space-y-3">
                {employeePerformance.slice(0, 5).map((emp, index) => (
                  <div 
                    key={emp.id} 
                    className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                      index === 0 
                        ? 'bg-amber-50/60 border-amber-200' 
                        : index === 1 
                        ? 'bg-slate-50 border-slate-200' 
                        : index === 2 
                        ? 'bg-orange-50/40 border-orange-200' 
                        : 'bg-white border-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        index === 0 ? 'bg-amber-500 text-white shadow-sm' :
                        index === 1 ? 'bg-slate-400 text-white' :
                        index === 2 ? 'bg-orange-400 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        #{index + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-900 truncate">{emp.name}</p>
                        <p className="text-[10px] text-slate-500 font-medium">
                          {emp.salesCount} vendas • {emp.osCount} O.S.
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-black text-emerald-600 font-mono">{formatCurrency(emp.totalSales)}</p>
                      <span className="text-[10px] font-bold text-slate-400">Comis: {formatCurrency(emp.totalCommission)}</span>
                    </div>
                  </div>
                ))}

                {employeePerformance.length === 0 && (
                  <div className="py-8 text-center text-slate-400 text-xs font-bold">
                    Nenhum colaborador cadastrado.
                  </div>
                )}
              </div>
            </div>

            {/* Gráfico de Vendas por Colaborador */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4 lg:col-span-2 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
                  <BarChart3 size={16} className="text-blue-600" />
                  Comparativo de Vendas
                </h3>
                <p className="text-[11px] text-slate-400">Total vendido por cada colaborador no período</p>
              </div>

              <div className="h-[230px] w-full min-w-0 pt-2">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                  <BarChart data={employeePerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                    <RechartsTooltip 
                      formatter={(val: any) => [formatCurrency(Number(val)), 'Vendido']}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', border: 'none', fontSize: '11px', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="totalSales" fill="#2563eb" radius={[8, 8, 0, 0]} barSize={28}>
                      {employeePerformance.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#f59e0b' : '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Tabela Detalhada de Desempenho e Metas */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-900">Desempenho Individual & Metas</h3>
                <p className="text-[11px] text-slate-500">Acompanhamento detalhado de vendas, metas e comissões calculadas</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3.5">Colaborador</th>
                    <th className="px-5 py-3.5">Cargo</th>
                    <th className="px-5 py-3.5">Vendido (PDV)</th>
                    <th className="px-5 py-3.5">Serviços (O.S.)</th>
                    <th className="px-5 py-3.5">Total Gerado</th>
                    <th className="px-5 py-3.5">Meta Mensal</th>
                    <th className="px-5 py-3.5">Progresso</th>
                    <th className="px-5 py-3.5 text-right">Comissão Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employeePerformance.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-800 flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs">
                          {emp.name.charAt(0)}
                        </div>
                        <span>{emp.name}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md">
                          {emp.role}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-700">
                        {formatCurrency(emp.totalSales - (emp.osCount > 0 ? (unifiedEntries.filter(e => e.employeeId === emp.id && e.originType === 'service_order').reduce((acc, c) => acc + c.saleAmount, 0)) : 0))}
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-700">
                        {formatCurrency(unifiedEntries.filter(e => e.employeeId === emp.id && e.originType === 'service_order').reduce((acc, c) => acc + c.saleAmount, 0))}
                      </td>
                      <td className="px-5 py-4 font-black text-slate-900 font-mono">
                        {formatCurrency(emp.totalSales)}
                      </td>
                      <td className="px-5 py-4 text-slate-500 font-medium">
                        {formatCurrency(emp.goalMonthly)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${emp.isGoalMet ? 'bg-emerald-500' : 'bg-blue-600'}`}
                              style={{ width: `${Math.min(emp.progress, 100)}%` }}
                            />
                          </div>
                          <span className={`text-[10px] font-black ${emp.isGoalMet ? 'text-emerald-600' : 'text-slate-600'}`}>
                            {emp.progress.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right font-black text-emerald-600 font-mono">
                        {formatCurrency(emp.totalCommission)}
                      </td>
                    </tr>
                  ))}

                  {employeePerformance.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Nenhum colaborador encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ====================================================================== */}
      {/* ABA 2: LISTA DE COLABORADORES & CADASTRO                              */}
      {/* ====================================================================== */}
      {activeTab === 'employees' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map((emp) => {
              const stats = employeePerformance.find(p => p.id === emp.id);

              return (
                <div 
                  key={emp.id}
                  className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-200 transition-all flex flex-col justify-between gap-4 group relative"
                >
                  <div>
                    {/* Header do Card */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white font-black text-base flex items-center justify-center shadow-md">
                          {emp.photoUrl ? (
                            <img src={emp.photoUrl} className="w-full h-full rounded-2xl object-cover" />
                          ) : (
                            emp.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{emp.name}</h3>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                            emp.role === 'tecnico' ? 'bg-amber-100 text-amber-800' :
                            emp.role === 'gerente' ? 'bg-purple-100 text-purple-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {emp.role}
                          </span>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex items-center gap-1">
                        <Tooltip content="Editar configurações, comissões e chave Pix deste colaborador.">
                          <button
                            type="button"
                            onClick={() => openEditEmployeeModal(emp)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
                          >
                            <Edit2 size={15} />
                          </button>
                        </Tooltip>
                        <Tooltip content="Remover este colaborador. As vendas registradas continuarão salvas.">
                          <button
                            type="button"
                            onClick={() => handleDeleteEmployee(emp)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
                        </Tooltip>
                      </div>
                    </div>

                    {/* Dados de Comissão */}
                    <div className="mt-4 grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs">
                      <div>
                        <span className="text-[9px] font-black uppercase text-slate-400 block">Comissão Vendas</span>
                        <strong className="text-emerald-600 text-sm font-black">{emp.defaultCommissionPercent ?? 5}%</strong>
                        <span className="text-[9px] text-slate-400 block">{emp.commissionType === 'profit_percent' ? 'sobre lucro' : 'sobre venda'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase text-slate-400 block">Comissão O.S.</span>
                        <strong className="text-blue-600 text-sm font-black">{emp.serviceCommissionPercent ?? 10}%</strong>
                        <span className="text-[9px] text-slate-400 block">sobre serviços</span>
                      </div>
                    </div>

                    {/* Resumo do Período */}
                    <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Vendido:</span>
                        <strong className="text-slate-900 font-mono">{formatCurrency(stats?.totalSales || 0)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Comissão a Receber:</span>
                        <strong className="text-emerald-600 font-mono">{formatCurrency(stats?.totalCommission || 0)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Meta Mensal:</span>
                        <span className="font-bold text-slate-700">{formatCurrency(emp.goalMonthly || 0)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Chave Pix e Pagamento Rápido */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    {emp.pixKey ? (
                      <Tooltip content={`Clique para copiar a chave Pix (${emp.pixKeyType?.toUpperCase() || 'PIX'}): ${emp.pixKey}`}>
                        <button
                          type="button"
                          onClick={() => handleCopyPix(emp.pixKey!, emp.id)}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          {copiedPixId === emp.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          <span>{copiedPixId === emp.id ? 'Copiado!' : 'Copiar Pix'}</span>
                        </button>
                      </Tooltip>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Sem Pix cadastrado</span>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEmployeeId(emp.id);
                        setActiveTab('commissions');
                      }}
                      className="text-[10px] font-black uppercase tracking-wider text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Ver Extrato</span>
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })}

            {employees.length === 0 && !isLoading && (
              <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                <Users size={40} className="mx-auto mb-3 text-slate-300" />
                <h3 className="text-sm font-black uppercase text-slate-700">Nenhum colaborador cadastrado</h3>
                <p className="text-xs text-slate-400 mt-1 mb-4">Cadastre os membros da sua equipe para começar a apurar comissões.</p>
                <button
                  type="button"
                  onClick={openNewEmployeeModal}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                >
                  Cadastrar Primeiro Colaborador
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* ABA 3: EXTRATO DE COMISSÕES & VENDAS                                   */}
      {/* ====================================================================== */}
      {activeTab === 'commissions' && (
        <div className="space-y-5 animate-in fade-in">
          
          {/* Barra de Filtros e Busca */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap flex-1">
              
              {/* Filtro de Colaborador */}
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Vendedor:</label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="all">Todos os Colaboradores</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>

              {/* Filtro de Status */}
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Status:</label>
                <select
                  value={commissionStatusFilter}
                  onChange={(e) => setCommissionStatusFilter(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="all">Todas as Comissões</option>
                  <option value="pending">Apenas Pendentes</option>
                  <option value="paid">Apenas Pagas</option>
                </select>
              </div>

              {/* Campo de Busca */}
              <div className="relative min-w-[200px] flex-1 max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar produto, cliente ou vendedor..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

            </div>

            {/* Exportar PDF */}
            <Tooltip content="Gera e baixa um extrato completo em PDF com todas as comissões filtradas prontas para conferência e impressão.">
              <button
                type="button"
                onClick={handleExportPDF}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 active:scale-95 transition-all cursor-pointer self-end md:self-auto"
              >
                <FileText size={15} />
                <span>Baixar PDF</span>
              </button>
            </Tooltip>
          </div>

          {/* Tabela do Extrato */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-900">Extrato Detalhado de Vendas & Comissões</h3>
                <p className="text-[11px] text-slate-500">
                  {filteredCommissionEntries.length} lançamentos encontrados neste período
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3.5">Data</th>
                    <th className="px-5 py-3.5">Vendedor</th>
                    <th className="px-5 py-3.5">Descrição</th>
                    <th className="px-5 py-3.5">Tipo</th>
                    <th className="px-5 py-3.5">Valor Venda</th>
                    <th className="px-5 py-3.5">% Comis.</th>
                    <th className="px-5 py-3.5">Valor Comissão</th>
                    <th className="px-5 py-3.5 text-center">Status</th>
                    <th className="px-5 py-3.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCommissionEntries.slice(0, visibleItemsCount).map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-4 text-slate-500 font-medium whitespace-nowrap">
                        {formatDate(entry.date)}
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-800 whitespace-nowrap">
                        {entry.employeeName}
                      </td>
                      <td className="px-5 py-4 text-slate-700 font-medium">
                        <div>
                          <p className="font-bold text-slate-900">{entry.description}</p>
                          {entry.customerName && (
                            <span className="text-[10px] text-slate-400">Cliente: {entry.customerName}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                          entry.originType === 'sale' 
                            ? 'bg-blue-50 text-blue-700' 
                            : entry.originType === 'service_order' 
                            ? 'bg-purple-50 text-purple-700' 
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {entry.originType === 'sale' ? 'PDV Venda' : entry.originType === 'service_order' ? 'O.S. Serviço' : 'Bônus Meta'}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-900 font-mono whitespace-nowrap">
                        {formatCurrency(entry.saleAmount)}
                      </td>
                      <td className="px-5 py-4 text-slate-500 font-bold whitespace-nowrap">
                        {entry.commissionPercent.toFixed(1)}%
                      </td>
                      <td className="px-5 py-4 font-black text-emerald-600 font-mono whitespace-nowrap">
                        +{formatCurrency(entry.commissionAmount)}
                      </td>
                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${
                          entry.status === 'paid' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {entry.status === 'paid' ? 'PAGO' : 'PENDENTE'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <Tooltip content={entry.status === 'paid' ? "Marcar como pendente caso precise estornar" : "Marcar esta comissão como PAGA ao colaborador"}>
                          <button
                            type="button"
                            onClick={() => handleToggleCommissionStatus(entry)}
                            disabled={isSaving}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 ${
                              entry.status === 'paid'
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                            }`}
                          >
                            {entry.status === 'paid' ? 'Estornar' : 'Pagar'}
                          </button>
                        </Tooltip>
                      </td>
                    </tr>
                  ))}

                  {filteredCommissionEntries.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                        Nenhum registro de comissão encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mostrar Mais */}
            {filteredCommissionEntries.length > visibleItemsCount && (
              <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => setVisibleItemsCount(prev => prev + 15)}
                  className="px-5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-wider text-slate-700 hover:bg-slate-100 transition-all cursor-pointer shadow-xs"
                >
                  Mostrar Mais (+15)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* ABA 4: REGRAS INTELIGENTES DE COMISSÃO & BÔNUS                         */}
      {/* ====================================================================== */}
      {activeTab === 'rules' && (
        <div className="space-y-6 animate-in fade-in">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-blue-50 border border-blue-200 p-5 rounded-3xl">
            <div>
              <h3 className="text-base font-black text-blue-900 uppercase">Regras e Bônus de Produtividade</h3>
              <p className="text-xs text-blue-700 mt-0.5">
                Crie regras para pagar porcentagens maiores em categorias específicas (ex: 15% em Acessórios) ou bônus ao bater a meta.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip content="Criar uma regra de comissão específica para uma categoria, produto ou serviço.">
                <button
                  type="button"
                  onClick={() => {
                    setEditingRule(null);
                    setRuleFormData({
                      name: '',
                      description: '',
                      targetType: 'category',
                      ruleType: 'percent',
                      calculationBase: 'gross_sale',
                      value: 10,
                      priority: 2,
                      isActive: true
                    });
                    setIsRuleModalOpen(true);
                  }}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Plus size={14} />
                  <span>Nova Regra</span>
                </button>
              </Tooltip>

              <Tooltip content="Criar um bônus pago uma única vez quando o colaborador atingir determinado faturamento.">
                <button
                  type="button"
                  onClick={() => {
                    setEditingGoal(null);
                    setGoalFormData({
                      name: 'Super Bônus de Metas',
                      bonusType: 'fixed',
                      calculationBase: 'gross_sale',
                      minAmount: 20000,
                      bonusValue: 500
                    });
                    setIsGoalModalOpen(true);
                  }}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                >
                  <Target size={14} />
                  <span>Novo Bônus</span>
                </button>
              </Tooltip>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Lista de Regras */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Regras de Comissão ({rules.length})</h4>
              {rules.map(rule => (
                <div key={rule.id} className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between gap-3">
                  <div>
                    <h5 className="font-black text-slate-900 text-xs uppercase">{rule.name}</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {rule.targetType === 'category' ? `Categoria: ${rule.targetId}` : rule.targetType === 'product' ? 'Produto Específico' : 'Geral'} • {rule.calculationBase === 'net_profit' ? 'Sobre Lucro' : 'Sobre Faturamento'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-base font-black text-emerald-600 font-mono">
                      {rule.ruleType === 'percent' ? `${rule.value}%` : formatCurrency(rule.value)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}

              {rules.length === 0 && (
                <div className="p-6 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200 text-xs font-bold">
                  Nenhuma regra de comissão adicional configurada.
                </div>
              )}
            </div>

            {/* Lista de Bônus por Meta */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Bônus por Atingir Meta ({goalTiers.length})</h4>
              {goalTiers.map(tier => (
                <div key={tier.id} className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between gap-3">
                  <div>
                    <h5 className="font-black text-slate-900 text-xs uppercase">{tier.name}</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Ao atingir faturamento de {formatCurrency(tier.minAmount)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-base font-black text-amber-600 font-mono">
                      +{tier.bonusType === 'percent' ? `${tier.bonusValue}%` : formatCurrency(tier.bonusValue)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteGoal(tier.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}

              {goalTiers.length === 0 && (
                <div className="p-6 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200 text-xs font-bold">
                  Nenhum bônus por meta configurado.
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ====================================================================== */}
      {/* MODAL 1: CADASTRAR / EDITAR COLABORADOR                                */}
      {/* ====================================================================== */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase text-slate-900">
                    {editingEmployee ? 'Editar Colaborador' : 'Novo Colaborador'}
                  </h3>
                  <p className="text-xs text-slate-500">Cadastre dados, porcentagens de comissão e chave Pix</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEmployeeModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={employeeFormData.name || ''}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, name: e.target.value })}
                    placeholder="Ex: Carlos Silva"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">Cargo / Função *</label>
                  <select
                    value={employeeFormData.role || 'vendedor'}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, role: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="vendedor">Vendedor(a)</option>
                    <option value="tecnico">Técnico(a)</option>
                    <option value="atendente">Atendente</option>
                    <option value="gerente">Gerente</option>
                  </select>
                </div>
              </div>

              {/* Comissões */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-[11px] font-black uppercase text-slate-700 flex items-center gap-1.5">
                  <Percent size={14} className="text-emerald-600" />
                  Comissões do Colaborador
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-emerald-700 block">
                      % Comissão Vendas (PDV)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={employeeFormData.defaultCommissionPercent ?? 5}
                        onChange={(e) => setEmployeeFormData({ ...employeeFormData, defaultCommissionPercent: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 pr-8 text-xs font-black text-slate-900 font-mono outline-none focus:border-emerald-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">%</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-blue-700 block">
                      % Comissão O.S. (Serviços)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={employeeFormData.serviceCommissionPercent ?? 10}
                        onChange={(e) => setEmployeeFormData({ ...employeeFormData, serviceCommissionPercent: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 pr-8 text-xs font-black text-slate-900 font-mono outline-none focus:border-blue-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">Base de Cálculo da Comissão de Venda</label>
                  <select
                    value={employeeFormData.commissionType || 'sales_percent'}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, commissionType: e.target.value as any })}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="sales_percent">Sobre o Valor Bruto da Venda (Recomendado)</option>
                    <option value="profit_percent">Sobre o Lucro Líquido (Venda menos Custo do Produto)</option>
                  </select>
                </div>
              </div>

              {/* Meta e Chave Pix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">Meta Mensal de Vendas (R$)</label>
                  <input
                    type="number"
                    step="50"
                    min="0"
                    value={employeeFormData.goalMonthly || 0}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, goalMonthly: parseFloat(e.target.value) || 0 })}
                    placeholder="10000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">Salário Base Fixo (R$)</label>
                  <input
                    type="number"
                    step="50"
                    min="0"
                    value={employeeFormData.salaryBase || 0}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, salaryBase: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Chave Pix para Repasse */}
              <div className="space-y-1 bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200">
                <label className="text-[10px] font-black uppercase text-emerald-800 block">
                  Chave Pix do Colaborador (Para Pagamento de Comissões)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={employeeFormData.pixKeyType || 'cpf'}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, pixKeyType: e.target.value as any })}
                    className="bg-white border border-emerald-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="cpf">CPF</option>
                    <option value="phone">Telefone</option>
                    <option value="email">E-mail</option>
                    <option value="random">Aleatória</option>
                  </select>
                  <input
                    type="text"
                    value={employeeFormData.pixKey || ''}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, pixKey: e.target.value })}
                    placeholder="Chave Pix..."
                    className="col-span-2 bg-white border border-emerald-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEmployeeModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs uppercase shadow-lg shadow-blue-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Salvando...' : 'Salvar Colaborador'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* MODAL 2: NOVA REGRA DE COMISSÃO                                        */}
      {/* ====================================================================== */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black uppercase text-slate-900">
                {editingRule ? 'Editar Regra' : 'Nova Regra de Comissão'}
              </h3>
              <button onClick={() => setIsRuleModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 block">Nome da Regra</label>
                <input
                  type="text"
                  value={ruleFormData.name || ''}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, name: e.target.value })}
                  placeholder="Ex: Comissão Especial Acessórios"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 block">Aplicar Sobre</label>
                <select
                  value={ruleFormData.targetType || 'global'}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, targetType: e.target.value as any, targetId: '' })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="global">Todos os Produtos e Vendas</option>
                  <option value="category">Categoria Específica</option>
                  <option value="service">Serviços / O.S.</option>
                </select>
              </div>

              {ruleFormData.targetType === 'category' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">Selecionar Categoria</label>
                  <select
                    value={ruleFormData.targetId || ''}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, targetId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="">Selecione uma categoria...</option>
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">% Comissão</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={ruleFormData.value || 0}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, value: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-black text-slate-900 outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">Base de Cálculo</label>
                  <select
                    value={ruleFormData.calculationBase || 'gross_sale'}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, calculationBase: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="gross_sale">Valor da Venda</option>
                    <option value="net_profit">Lucro Líquido</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRuleModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveRule}
                disabled={isSaving}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase"
              >
                Salvar Regra
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* MODAL 3: NOVO BÔNUS DE META                                            */}
      {/* ====================================================================== */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black uppercase text-slate-900">Novo Bônus por Meta</h3>
              <button onClick={() => setIsGoalModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 block">Nome do Bônus</label>
                <input
                  type="text"
                  value={goalFormData.name || ''}
                  onChange={(e) => setGoalFormData({ ...goalFormData, name: e.target.value })}
                  placeholder="Ex: Meta Ouro R$ 20.000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 block">Faturamento Mínimo para Desbloquear (R$)</label>
                <input
                  type="number"
                  step="100"
                  min="0"
                  value={goalFormData.minAmount || 0}
                  onChange={(e) => setGoalFormData({ ...goalFormData, minAmount: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-black text-slate-900 outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 block">Valor do Bônus Pago (R$)</label>
                <input
                  type="number"
                  step="50"
                  min="0"
                  value={goalFormData.bonusValue || 0}
                  onChange={(e) => setGoalFormData({ ...goalFormData, bonusValue: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-black text-slate-900 outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsGoalModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveGoal}
                disabled={isSaving}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase"
              >
                Salvar Bônus
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default EmployeeManagementTab;
