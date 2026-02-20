'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Tesseract from 'tesseract.js';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import PageHeader from '@/components/ui/PageHeader';
import {
  Plus,
  Camera,
  Search,
  Filter,
  AlertCircle,
  Loader2,
  Save,
  Wallet,
  CheckCircle2,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Toaster, toast } from 'react-hot-toast';
import { Button, Modal } from '@/components/ui/shared';
import CurrencyInput from '@/components/ui/shared/CurrencyInput';
import { cn } from '@/lib/utils';

export default function ContasPagarPage() {
  const { profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [contas, setContas] = useState<any[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const initialForm = {
    descricao: '',
    valor_total: '',
    data_vencimento: new Date().toISOString().split('T')[0],
    categoria_id: '',
    fornecedor_id: '',
    status: 'pendente',
    forma_pagamento: 'boleto',
  };

  const [formData, setFormData] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  function safeFormatDate(value: any, fmt = 'dd/MM/yyyy') {
    if (!value) return '';
    try {
      const date = typeof value === 'string' ? parseISO(value) : value;
      return format(date, fmt);
    } catch (e) {
      return '';
    }
  }

  function parseCurrency(value: string | number) {
    if (value == null) return 0;
    const s = String(value);
    // Remove thousand separators (.) then convert decimal comma to dot
    const cleaned = s
      .replace(/\./g, '')
      .replace(/,/g, '.')
      .replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  function formatToCurrencyDisplay(value: string | number) {
    const num = typeof value === 'number' ? value : parseCurrency(value);
    if (!isFinite(num)) return '';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  }

  const [categorias, setCategorias] = useState<any[]>([]);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [buscaDescricao, setBuscaDescricao] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function init() {
      if (!profile?.organization_id) return;
      const { data: cats } = await supabase
        .from('fin_categorias_despesa')
        .select('*')
        .order('nome');
      setCategorias(cats || []);
      await loadContas();
    }
    void init();
  }, [profile]);

  async function loadContas() {
    if (!profile?.organization_id) return;
    try {
      const { data, error } = await supabase
        .from('fin_contas_pagar')
        .select('*, fornecedores(nome), categoria:fin_categorias_despesa(nome)')
        .order('data_vencimento', { ascending: true });
      if (error) throw error;
      setContas(data || []);
    } catch (err) {
      toast.error('Erro ao carregar contas');
    } finally {
      setLoading(false);
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    const toastId = toast.loading('Lendo dados do cupom (OCR)...');

    try {
      const result = await Tesseract.recognize(file, 'por+eng', {
        logger: (m: any) => console.log(m),
      } as any);
      const text = result?.data?.text || '';

      const regexValor = /(?:TOTAL|VALOR|PAGO|PAGAR).*?(\d+[,.]\d{2})/gi;
      const matchesValor = [...text.matchAll(regexValor)];
      const valorDetectado =
        matchesValor.length > 0 ? matchesValor[matchesValor.length - 1][1].replace(',', '.') : '';

      const regexData = /(\d{2})[/.](\d{2})[/.](\d{2,4})/;
      const matchData = text.match(regexData);
      let dataDetectada = new Date().toISOString().split('T')[0];
      if (matchData) {
        const [_all, dia, mes, ano] = matchData;
        const anoFull = ano.length === 2 ? `20${ano}` : ano;
        dataDetectada = `${anoFull}-${mes}-${dia}`;
      }

      setFormData((prev) => ({
        ...prev,
        descricao: 'Lançamento via Scan',
        valor_total: formatToCurrencyDisplay(valorDetectado),
        data_vencimento: dataDetectada,
      }));

      toast.success('Leitura concluída! Por favor, valide os dados.', { id: toastId });
      setIsModalOpen(true);
    } catch (err) {
      console.error('Erro no OCR:', err);
      toast.error('Não conseguimos ler a imagem. Tente preencher manualmente.', { id: toastId });
      setIsModalOpen(true);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organization_id) return;
    setSaving(true);
    try {
      const toastId = toast.loading('Salvando lançamento...');
      const numericValue = parseCurrency(formData.valor_total);
      const payload: any = {
        ...formData,
        valor_total: numericValue,
        organization_id: profile.organization_id,
        categoria_id: formData.categoria_id || null,
        fornecedor_id: formData.fornecedor_id || null,
      };

      const { data, error } = await supabase.from('fin_contas_pagar').insert([payload]).select();
      if (error) throw error;
      // se vencimento no futuro, criar tarefa de alerta na agenda
      try {
        const insertedId = data && Array.isArray(data) && data[0] ? data[0].id : null;
        if (payload.data_vencimento) {
          const vencDate = new Date(payload.data_vencimento);
          const today = new Date();
          // zera horas para comparar apenas data
          vencDate.setHours(0, 0, 0, 0);
          today.setHours(0, 0, 0, 0);
          if (vencDate > today) {
            const titulo = `Vencimento: ${payload.descricao || 'Conta a pagar'}`;
            const detalhe = `ContaID:${insertedId || ''}\nLink:/dashboard/financeiro/contas-pagar/${insertedId || ''}\nValor: R$ ${Number(payload.valor_total).toFixed(2)}\nForma: ${payload.forma_pagamento || ''}`;
            await supabase.from('tarefas_agenda').insert([
              {
                organization_id: profile.organization_id,
                titulo,
                tipo: 'financeiro',
                data_agendada: payload.data_vencimento,
                detalhe,
                created_by: profile?.id || null,
              },
            ]);
          }
        }
      } catch (agendaErr) {
        console.error('Erro ao criar tarefa na agenda:', agendaErr);
        toast.error('Lançamento salvo, mas não foi possível criar lembrete na agenda.');
      }
      toast.success('Conta lançada com sucesso!', { id: toastId });
      // Reset form so reopening modal shows empty values
      setFormData(initialForm);
      setIsModalOpen(false);
      // refresh list; prefer awaiting to ensure UI shows new data
      await loadContas();
      // if insertion returned row, focus could be managed here
    } catch (err) {
      const e: any = err;
      console.error('Erro ao salvar lançamento:', e);
      const message =
        e?.message || e?.error?.message || (typeof e === 'string' ? e : null) || JSON.stringify(e);
      toast.error(message || 'Erro ao salvar lançamento');
    } finally {
      setSaving(false);
    }
  };

  const baixarPagamento = async (id: string) => {
    try {
      const { error } = await supabase
        .from('fin_contas_pagar')
        .update({
          status: 'pago',
          data_pagamento: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Pagamento baixado com sucesso!');
      // marcar tarefa de agenda relacionada (se existir) como concluída
      try {
        await supabase
          .from('tarefas_agenda')
          .update({ concluido: true, updated_at: new Date().toISOString() })
          .ilike('detalhe', `%ContaID:${id}%`);
      } catch (errTask) {
        console.error('Erro ao marcar tarefa como concluída:', errTask);
      }

      void loadContas();
    } catch (err) {
      console.error('Erro ao baixar pagamento:', err);
      toast.error('Não foi possível registrar o pagamento.');
    }
  };

  const contasFiltradas = contas.filter((conta) => {
    const matchesStatus = filtroStatus === 'todos' || conta.status === filtroStatus;
    const busca = buscaDescricao.trim().toLowerCase();
    const matchesBusca =
      busca === '' ||
      (conta.descricao || '').toLowerCase().includes(busca) ||
      (conta.fornecedores?.nome || '').toLowerCase().includes(busca);
    return matchesStatus && matchesBusca;
  });

  return (
    <div className="p-6 space-y-6 animate-fade-up">
      <Toaster position="top-right" />

      <PageHeader
        title="Financeiro: Contas a Pagar"
        description="Gestão de despesas, boletos e compromissos fornecedores."
        icon={Wallet}
      >
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()} icon={Camera}>
            Escanear Cupom
          </Button>
          <Button onClick={() => setIsModalOpen(true)} icon={Plus}>
            Novo Lançamento
          </Button>
        </div>
      </PageHeader>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />

      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por descrição ou fornecedor..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100"
            value={buscaDescricao}
            onChange={(e) => setBuscaDescricao(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-slate-400" />
          <select
            className="border rounded-lg p-2 bg-slate-50 text-sm font-medium outline-none"
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
          >
            <option value="todos">Todos os Status</option>
            <option value="pendente">Pendentes</option>
            <option value="pago">Pagos</option>
            <option value="atrasado">Atrasados</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-[10px] font-bold">
            <tr>
              <th className="px-6 py-4">Vencimento</th>
              <th className="px-6 py-4">Descrição / Fornecedor</th>
              <th className="px-6 py-4">Categoria</th>
              <th className="px-6 py-4">Valor</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {contasFiltradas.map((conta) => (
              <tr key={conta.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-700">
                  {safeFormatDate(conta.data_vencimento, 'dd/MM/yyyy')}
                </td>
                <td className="px-6 py-4">
                  <p className="font-bold text-slate-800">{conta.descricao}</p>
                  <p className="text-xs text-slate-400">
                    {conta.fornecedores?.nome || 'Despesa Avulsa'}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold">
                    {conta.categoria?.nome || 'Geral'}
                  </span>
                </td>
                <td className="px-6 py-4 font-bold text-slate-900">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    conta.valor_total
                  )}
                </td>
                <td className="px-6 py-4">
                  <BadgeStatus status={conta.status} />
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/dashboard/financeiro/contas-pagar/${conta.id}`}
                      className="inline-flex items-center gap-1 text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 font-bold text-xs transition-all"
                    >
                      Ver
                    </Link>

                    {conta.status !== 'pago' ? (
                      <button
                        onClick={() => baixarPagamento(conta.id)}
                        className="flex items-center gap-1 text-emerald-600 hover:bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100 font-bold text-xs transition-all"
                      >
                        <CheckCircle2 size={14} />
                        Dar Baixa
                      </button>
                    ) : (
                      <div className="flex items-center gap-1 text-slate-400 font-medium text-xs">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        Liquidado em {safeFormatDate(conta.data_pagamento, 'dd/MM')}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen || isScanning}
        onClose={() => setIsModalOpen(false)}
        title={isScanning ? 'Processando Imagem...' : 'Novo Lançamento Financeiro'}
      >
        {isScanning ? (
          <div className="p-10 flex flex-col items-center justify-center text-center">
            <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
            <p className="text-slate-600 font-medium">Estamos lendo os dados do cupom...</p>
            <p className="text-xs text-slate-400 mt-1">Isso leva apenas alguns segundos.</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-4 space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg flex items-start gap-3 mb-2">
              <AlertCircle size={18} className="text-blue-600 mt-0.5" />
              <p className="text-xs text-blue-700 leading-relaxed">
                Confirme os dados extraídos da foto. Se necessário, ajuste os valores e a data antes
                de salvar.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase">
                  Descrição da Conta
                </label>
                <input
                  required
                  className="w-full border rounded-lg p-2 mt-1 outline-none focus:ring-2 focus:ring-blue-100"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                />
              </div>

              <div className="col-span-2 md:col-span-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Categoria</label>
                <select
                  required
                  className="w-full border rounded-lg p-2 mt-1 bg-white"
                  value={formData.categoria_id}
                  onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                >
                  <option value="">Selecione...</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2 md:col-span-1">
                <label className="text-xs font-bold text-slate-500 uppercase">
                  Forma de Pagamento
                </label>
                <select
                  className="w-full border rounded-lg p-2 mt-1 bg-white"
                  value={formData.forma_pagamento}
                  onChange={(e) => setFormData({ ...formData, forma_pagamento: e.target.value })}
                >
                  <option value="pix">PIX</option>
                  <option value="boleto">Boleto</option>
                  <option value="cartao_credito">Cartão de Crédito</option>
                  <option value="dinheiro">Dinheiro</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">
                  Valor Total (R$)
                </label>
                <CurrencyInput
                  required
                  className="w-full border rounded-lg p-2 mt-1 font-bold text-blue-600"
                  value={formData.valor_total}
                  onChange={(val) =>
                    setFormData({
                      ...formData,
                      valor_total:
                        typeof val === 'string' ? val : (val.target as HTMLInputElement).value,
                    })
                  }
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Vencimento</label>
                <input
                  type="date"
                  required
                  className="w-full border rounded-lg p-2 mt-1"
                  value={formData.data_vencimento}
                  onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                />
              </div>

              <div className="col-span-2 flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                <input
                  type="checkbox"
                  id="isPaid"
                  checked={formData.status === 'pago'}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.checked ? 'pago' : 'pendente' })
                  }
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label
                  htmlFor="isPaid"
                  className="text-sm font-medium text-slate-700 cursor-pointer"
                >
                  Já foi pago? (Marcar como liquidado)
                </label>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setIsModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" icon={Save} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Lançamento'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function BadgeStatus({ status }: { status: string }) {
  const styles: any = {
    pendente: 'bg-yellow-100 text-yellow-700',
    pago: 'bg-emerald-100 text-emerald-700',
    atrasado: 'bg-red-100 text-red-700',
  };
  return (
    <span
      className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase', styles[status])}
    >
      {status}
    </span>
  );
}
