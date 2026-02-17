
import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, ClipboardList, Target, Zap, ArrowUpRight, History, BarChart3, PieChart as PieIcon } from 'lucide-react';
import { ServiceOrder, Sale } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface Props {
  orders: ServiceOrder[];
  sales: Sale[];
}

const FinanceTab: React.FC<Props> = ({ orders, sales }) => {
  const deliveredOrders = orders.filter(order => order.status === 'Entregue');
  
  // Cálculos de O.S.
  const totalOSRevenue = deliveredOrders.reduce((acc, curr) => acc + curr.total, 0);
  const totalOSPartsCost = deliveredOrders.reduce((acc, curr) => acc + curr.partsCost, 0);
  const totalOSProfit = deliveredOrders.reduce((acc, curr) => acc + curr.serviceCost, 0);

  // Cálculos de Vendas
  const totalSalesRevenue = sales.reduce((acc, curr) => acc + curr.finalPrice, 0);
  const totalSalesCost = sales.reduce((acc, curr) => acc + (curr.costAtSale * curr.quantity), 0);
  const totalSalesProfit = totalSalesRevenue - totalSalesCost;

  const totalNetProfit = totalOSProfit + totalSalesProfit;
  const totalCosts = totalOSPartsCost + totalSalesCost;

  // Dados para Gráfico de Barras (Lucro)
  const chartData = [
    { name: 'O.S.', value: totalOSProfit, color: '#3b82f6' },
    { name: 'VENDAS', value: totalSalesProfit, color: '#10b981' },
    { name: 'TOTAL', value: totalNetProfit, color: '#8b5cf6' },
  ];

  // Dados para Gráfico de Pizza (Faturamento)
  const sourceData = [
    { name: 'O.S.', value: totalOSRevenue },
    { name: 'LOJA', value: totalSalesRevenue },
  ].filter(d => d.value > 0);

  const COLORS = ['#3b82f6', '#10b981'];

  // Últimas 6 movimentações (mais compacto para caber com gráficos)
  const recentActivities = [
    ...deliveredOrders.map(o => ({ 
      id: o.id, type: 'OS', label: o.customerName, val: o.total, date: o.date, profit: o.serviceCost 
    })),
    ...sales.map(s => ({ 
      id: s.id, type: 'VENDA', label: s.productName, val: s.finalPrice, date: s.date,
      profit: s.finalPrice - (s.costAtSale * s.quantity)
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);

  return (
    <div className="space-y-3 pb-8 w-full max-w-full animate-in fade-in duration-500 overflow-x-hidden">
      {/* Header Compacto */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tighter leading-none uppercase">Financeiro</h2>
          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1">Dashboard de Performance</p>
        </div>
        <div className="bg-emerald-500 text-white px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-emerald-500/20">
          <Zap size={10} fill="currentColor" />
          SQL Ativo
        </div>
      </div>

      {/* Cards Principais Otimizados */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {[
          { label: 'Receita O.S.', val: totalOSRevenue, icon: ClipboardList, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Vendas Loja', val: totalSalesRevenue, icon: ShoppingBag, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Custos Totais', val: totalCosts, icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50' },
          { label: 'Lucro Líquido', val: totalNetProfit, icon: Target, color: 'text-white', bg: 'bg-slate-900', dark: true },
        ].map((card, idx) => (
          <div key={idx} className={`${card.dark ? 'bg-slate-900 border-slate-800 shadow-xl shadow-slate-900/10' : 'bg-white border-slate-100 shadow-sm'} p-3 rounded-2xl border flex items-center gap-3`}>
            <div className={`w-8 h-8 ${card.dark ? 'bg-emerald-500' : card.bg} ${card.dark ? 'text-white' : card.color} rounded-xl flex items-center justify-center shrink-0`}>
              <card.icon size={16} />
            </div>
            <div className="min-w-0">
              <p className={`text-[7px] ${card.dark ? 'text-slate-500' : 'text-slate-400'} font-black uppercase tracking-widest mb-0.5 truncate`}>{card.label}</p>
              <p className={`text-xs font-black ${card.dark ? 'text-white' : 'text-slate-800'} truncate`}>{formatCurrency(card.val)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Seção de Gráficos Otimizada */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Gráfico 1: Lucratividade (Barras) */}
        <div className="bg-white p-4 rounded-3xl border border-slate-50 shadow-sm flex flex-col min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={12} className="text-blue-500" />
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lucratividade</h3>
          </div>
          <div className="w-full min-h-[180px] h-[180px] relative">
            <ResponsiveContainer width="100%" height="100%" debounce={50}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={8} fontWeight="900" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <YAxis fontSize={8} axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={25}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Composição (Pizza) */}
        <div className="bg-white p-4 rounded-3xl border border-slate-50 shadow-sm flex flex-col min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <PieIcon size={12} className="text-emerald-500" />
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Origem de Receita</h3>
          </div>
          <div className="w-full min-h-[180px] h-[180px] relative">
            {sourceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" debounce={50}>
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%" cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center opacity-20">
                <p className="text-[8px] font-black uppercase">Sem Dados</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Extrato de Movimentações (Slim) */}
      <div className="bg-white rounded-[2rem] border border-slate-50 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/20">
          <div className="flex items-center gap-2">
            <History size={14} className="text-slate-400" />
            <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Fluxo Recente</h3>
          </div>
          <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest">Últimos 6 Itens</span>
        </div>

        <div className="divide-y divide-slate-50">
          {recentActivities.map((act, idx) => (
            <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-50/30 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${act.type === 'OS' ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-500'}`}>
                  {act.type === 'OS' ? <ClipboardList size={14} /> : <ShoppingBag size={14} />}
                </div>
                <div className="min-w-0">
                  <h4 className="text-[10px] font-black text-slate-700 uppercase truncate leading-tight">{act.label}</h4>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">{act.type}</span>
                    <span className="text-[7px] text-slate-300">•</span>
                    <span className="text-[7px] font-bold text-slate-400">{formatDate(act.date)}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-800">{formatCurrency(act.val)}</p>
                <div className="flex items-center justify-end gap-1 text-emerald-500">
                  <ArrowUpRight size={8} />
                  <span className="text-[8px] font-black">+{formatCurrency(act.profit)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Nota Informativa de Rodapé */}
      <div className="bg-slate-100/50 p-3 rounded-2xl border border-slate-200/50 flex items-center gap-3">
        <div className="w-7 h-7 bg-white shadow-sm text-slate-400 rounded-lg flex items-center justify-center shrink-0">
          <DollarSign size={14} />
        </div>
        <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest leading-normal">
          Dados sincronizados com <span className="text-blue-600">Nuvem SQL</span>. <br/>
          As O.S. são contabilizadas no status <span className="text-slate-800">"Entregue"</span>.
        </p>
      </div>
    </div>
  );
};

export default FinanceTab;
