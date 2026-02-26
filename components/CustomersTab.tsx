
import React, { useState, useMemo } from 'react';
import { Users, UserPlus, Search, Phone, Mail, MapPin, FileText, Trash2, Edit2, X, Check, Loader2, Filter } from 'lucide-react';
import { Customer, AppSettings } from '../types';

interface Props {
  customers: Customer[];
  setCustomers: (customers: Customer[]) => Promise<void>;
  onDeleteCustomer: (id: string) => Promise<void>;
  settings: AppSettings;
}

const CustomersTab: React.FC<Props> = ({ customers, setCustomers, onDeleteCustomer, settings }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    document: '',
    notes: ''
  });

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      !c.isDeleted && (
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm) ||
        (c.document && c.document.includes(searchTerm))
      )
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [customers, searchTerm]);

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        phone: customer.phone,
        email: customer.email || '',
        address: customer.address || '',
        document: customer.document || '',
        notes: customer.notes || ''
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        document: '',
        notes: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.phone) {
      alert('Nome e Telefone são obrigatórios.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingCustomer) {
        const updated = customers.map(c => 
          c.id === editingCustomer.id ? { ...c, ...formData } : c
        );
        await setCustomers(updated);
      } else {
        const newCustomer: Customer = {
          id: 'CUST_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
          ...formData,
          createdAt: new Date().toISOString()
        };
        await setCustomers([...customers, newCustomer]);
      }
      setIsModalOpen(false);
    } catch (err) {
      alert('Erro ao salvar cliente.');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!customerToDelete) return;
    setIsSaving(true);
    try {
      await onDeleteCustomer(customerToDelete.id);
      setCustomerToDelete(null);
    } catch (err) {
      alert('Erro ao excluir cliente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Clientes</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestão de Carteira de Clientes</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-slate-900 text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
        >
          <UserPlus size={18} />
          Novo Cliente
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text"
          placeholder="BUSCAR POR NOME, TELEFONE OU DOCUMENTO..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-white border-none rounded-[2rem] py-6 pl-16 pr-6 text-sm font-bold text-slate-800 placeholder-slate-300 shadow-xl shadow-slate-200/20 outline-none focus:ring-4 focus:ring-blue-50 transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map(customer => (
          <div key={customer.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center border border-slate-100">
                  <Users size={24} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 uppercase text-xs tracking-tight">{customer.name}</h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{customer.document || 'Sem Documento'}</p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleOpenModal(customer)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => setCustomerToDelete(customer)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3 text-slate-500">
                <Phone size={14} className="text-slate-300" />
                <span className="text-[10px] font-bold uppercase">{customer.phone}</span>
              </div>
              {customer.email && (
                <div className="flex items-center gap-3 text-slate-500">
                  <Mail size={14} className="text-slate-300" />
                  <span className="text-[10px] font-bold lowercase truncate">{customer.email}</span>
                </div>
              )}
              {customer.address && (
                <div className="flex items-center gap-3 text-slate-500">
                  <MapPin size={14} className="text-slate-300" />
                  <span className="text-[10px] font-bold uppercase truncate">{customer.address}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
              <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Desde {new Date(customer.createdAt).toLocaleDateString('pt-BR')}</span>
              <button className="text-[8px] font-black text-blue-600 uppercase tracking-widest hover:underline">Ver Histórico</button>
            </div>
          </div>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="py-20 text-center space-y-4">
          <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mx-auto">
            <Users size={40} />
          </div>
          <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Nenhum cliente encontrado</p>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 z-[100] flex items-end md:items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 border border-slate-100">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}</h3>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Preencha os dados cadastrais</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 p-3 bg-slate-50 rounded-full active:scale-90"><X size={20} /></button>
            </div>
            
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nome Completo</label>
                  <input 
                    value={formData.name} 
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="NOME DO CLIENTE" 
                    className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none font-black uppercase text-xs focus:ring-4 focus:ring-slate-100 transition-all" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Telefone / WhatsApp</label>
                  <input 
                    value={formData.phone} 
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(00) 00000-0000" 
                    className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none font-black uppercase text-xs focus:ring-4 focus:ring-slate-100 transition-all" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">CPF / CNPJ</label>
                  <input 
                    value={formData.document} 
                    onChange={e => setFormData({ ...formData, document: e.target.value })}
                    placeholder="000.000.000-00" 
                    className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none font-black uppercase text-xs focus:ring-4 focus:ring-slate-100 transition-all" 
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">E-mail</label>
                  <input 
                    value={formData.email} 
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="cliente@email.com" 
                    className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none font-bold lowercase text-xs focus:ring-4 focus:ring-slate-100 transition-all" 
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Endereço</label>
                  <input 
                    value={formData.address} 
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    placeholder="RUA, NÚMERO, BAIRRO, CIDADE" 
                    className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none font-black uppercase text-xs focus:ring-4 focus:ring-slate-100 transition-all" 
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Observações Internas</label>
                  <textarea 
                    value={formData.notes} 
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="NOTAS SOBRE O CLIENTE..." 
                    rows={3}
                    className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none font-medium text-xs focus:ring-4 focus:ring-slate-100 transition-all" 
                  />
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 flex gap-3">
              <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="flex-1 py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                {editingCustomer ? 'Salvar Alterações' : 'Cadastrar Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {customerToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 z-[200] flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 border border-slate-100">
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <Trash2 size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="font-black text-slate-800 uppercase text-lg">Excluir Cliente?</h3>
                <p className="text-slate-400 text-sm font-bold uppercase leading-tight px-4">
                  Deseja realmente apagar <span className="text-red-600 font-black">"{customerToDelete.name}"</span>?
                </p>
              </div>
              <div className="flex flex-col gap-3 pt-4">
                <button 
                  onClick={confirmDelete} 
                  disabled={isSaving}
                  className="w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-red-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={18} /> : 'Confirmar Exclusão'}
                </button>
                <button 
                  onClick={() => setCustomerToDelete(null)} 
                  disabled={isSaving}
                  className="w-full py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersTab;
