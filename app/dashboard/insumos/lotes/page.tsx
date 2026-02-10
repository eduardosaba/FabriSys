'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  FileText,
  Package,
  Search,
  Trash2,
  Truck,
  Plus,
  Edit,
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase'; // Seu cliente Supabase existente
import { useAuth } from '@/lib/auth';
// Importamos os componentes visuais do arquivo shared criado anteriormente
import { Button, InputField, SelectField, Modal } from '@/components/ui/shared';
import PageHeader from '@/components/ui/PageHeader'; // Seu componente existente
// fornecedores serão carregados do Supabase

// --- TIPAGEM ---
interface Movimentacao {
  id: number;
  created_at: string;
  tipo: 'entrada' | 'saida';
  quantidade: number;
  insumo: { nome: string; unidade_estoque: string };
  usuario?: string;
  nf?: string; // Nota fiscal
  fornecedor?: string;
}

interface InsumoSelect {
  id: string;
  nome: string;
  unidade_estoque: string;
  custo_por_ue: number;
}

interface ItemEntrada {
  insumo_id: string;
  nome: string;
  ue: string;
  qtd: number;
  custo_unitario: number;
  total: number;
  lote?: string | null;
  validade?: string | null; // ISO date (YYYY-MM-DD)
}

export default function ControleEstoquePage() {
  const { profile, loading: authLoading } = useAuth();
  const canManageMovimentacoes =
    !!profile && (profile.role === 'admin' || profile.role === 'master');
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [insumos, setInsumos] = useState<InsumoSelect[]>([]);
  const [fornecedores, setFornecedores] = useState<{ value: string; label: string }[]>([]);
  const [_loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estados do Modal de Nova Entrada (Carrinho)
  const [headerEntrada, setHeaderEntrada] = useState<{
    fornecedorId: string;
    data: string;
    nf: string;
  }>({ fornecedorId: '', data: new Date().toISOString().split('T')[0], nf: '' });
  const [itensEntrada, setItensEntrada] = useState<ItemEntrada[]>([]);
  const [itemAtual, setItemAtual] = useState({
    insumo_id: '',
    qtd: '',
    custo: '',
    lote: '',
    validade: '',
  });
  const [saving, setSaving] = useState(false);
  // Estados para edição/exclusão de movimentação
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMovimentacao, setEditingMovimentacao] = useState<Movimentacao | null>(null);
  const [editFornecedorId, setEditFornecedorId] = useState<string>('');
  const [editNF, setEditNF] = useState<string>('');
  const [editQuantidade, setEditQuantidade] = useState<string>('0');
  const [deletePendingMov, setDeletePendingMov] = useState<Movimentacao | null>(null);
  const [processingDelete, setProcessingDelete] = useState(false);
  const [_processingEditSave, setProcessingEditSave] = useState(false);

  const getErrorMessage = (err: unknown) => {
    if (!err) return 'Erro desconhecido';
    if (typeof err === 'string') return err;
    if (err instanceof Error) return err.message;
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  };

  // Helpers para moeda BRL
  const formatBRL = (value: number | string) => {
    const n = Number(value) || 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
  };

  // Recebe uma string de input (qualquer) e converte para string numérica com 2 casas decimais (padrão '1234.56')
  const parseCurrencyInputToNumberString = (input: string) => {
    const digits = (input || '').replace(/\D/g, '');
    if (!digits) return '0.00';
    const num = parseInt(digits, 10) / 100;
    return num.toFixed(2);
  };

  const fetchDados = useCallback(async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);

      // 1. Buscar histórico (VIEW `historico_estoque`) — formato legacy garantido pela view
      const { data: dataHist, error: errHist } = await supabase
        .from('historico_estoque')
        .select(
          `
                                                id, created_at, tipo, quantidade, nf, fornecedor, insumo
                                `
        )
        .order('created_at', { ascending: false })
        .limit(50);

      if (errHist) {
        console.error('Erro ao buscar historico_estoque:', errHist);
        throw errHist;
      }

      // 2. Buscar Insumos para o Select do Modal
      const { data: dataInsumos, error: errIns } = await supabase
        .from('insumos')
        .select('id, nome, unidade_estoque, custo_por_ue')
        .order('nome');

      if (errIns) throw errIns;

      setMovimentacoes(dataHist || []);
      setInsumos(dataInsumos || []);

      // 3. Buscar Fornecedores (nomes) para o select
      try {
        const { data: dataFornecedores, error: errFor } = await supabase
          .from('fornecedores')
          .select('id, nome')
          .order('nome');
        if (errFor) {
          console.error('Erro ao buscar fornecedores:', errFor);
        } else {
          const fornecedorRows = (dataFornecedores || []) as Array<{ id: string; nome: string }>;
          setFornecedores(
            fornecedorRows.map((f) => ({ value: String(f.id), label: f.nome || '' }))
          );
        }
      } catch (e) {
        console.error('Erro ao buscar fornecedores:', e);
      }
    } catch (error: unknown) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados de estoque: ' + getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (authLoading) return;

    if (!profile?.id) {
      setLoading(false);
      return;
    }

    void fetchDados();
  }, [fetchDados, profile?.id, authLoading]);

  // --- LÓGICA DO CARRINHO DE ENTRADA ---
  const handleAddItem = () => {
    if (!itemAtual.insumo_id || !itemAtual.qtd) {
      toast.error('Selecione produto e informe quantidade válida');
      return;
    }

    const insumoRef = insumos.find((i) => String(i.id) === String(itemAtual.insumo_id));
    if (!insumoRef) return;

    // Usa o custo digitado ou o custo atual do cadastro
    const custo = itemAtual.custo ? parseFloat(itemAtual.custo) : insumoRef.custo_por_ue || 0;
    const qtd = parseFloat(itemAtual.qtd);

    if (!qtd || qtd <= 0) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }

    // validade se informada não pode ser anterior à data atual
    if (itemAtual.validade) {
      try {
        const valDate = new Date(itemAtual.validade);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        valDate.setHours(0, 0, 0, 0);
        if (valDate < today) {
          toast.error('Validade informada já expirou');
          return;
        }
      } catch {
        /* ignore parse errors, será tratada no servidor */
      }
    }

    const novoItem: ItemEntrada = {
      insumo_id: String(insumoRef.id),
      nome: insumoRef.nome,
      ue: insumoRef.unidade_estoque,
      qtd: qtd,
      custo_unitario: custo,
      total: qtd * custo,
      lote: itemAtual.lote || null,
      validade: itemAtual.validade || null,
    };

    setItensEntrada([...itensEntrada, novoItem]);
    setItemAtual({ insumo_id: '', qtd: '', custo: '', lote: '', validade: '' }); // Limpa inputs para o próximo
  };

  const handleRemoveItem = (idx: number) => {
    setItensEntrada(itensEntrada.filter((_, i) => i !== idx));
  };

  // --- FINALIZAR ENTRADA (SALVAR NO BANCO) ---
  const handleConfirmarEntrada = async () => {
    try {
      setSaving(true);

      console.log('handleConfirmarEntrada: iniciando, items=', itensEntrada.length);

      // Loop indexado para permitir logs/estado por item
      for (let idx = 0; idx < itensEntrada.length; idx++) {
        const item = itensEntrada[idx];
        const progresso = `${idx + 1}/${itensEntrada.length}`;
        console.log(`Salvando item ${progresso}`, item);
        toast.loading(`Salvando item ${progresso}...`, { id: `save-item-${idx}` });

        // 1. Inserir registro na tabela canônica `movimentacao_estoque`.
        const fornecedorNome =
          fornecedores.find((f) => String(f.value) === String(headerEntrada.fornecedorId))?.label ||
          null;
        const insertPayload = {
          tipo_movimento: 'entrada',
          quantidade: item.qtd,
          observacoes: headerEntrada.nf || null,
          data_movimento: headerEntrada.data || new Date().toISOString(),
          insumo_id: item.insumo_id || null,
          fornecedor_id: headerEntrada.fornecedorId || null,
          fornecedor: fornecedorNome || null,
          lote: item.lote || null,
          validade: item.validade || null,
        };

        console.log('Insert payload', JSON.stringify(insertPayload));
        const { data: insertDataRaw, error: errInsert } = await supabase
          .from('movimentacao_estoque')
          .insert(insertPayload)
          .select('id');
        console.log('Insert result', { insertDataRaw, errInsert });
        try {
          const insertData = insertDataRaw as unknown;
          console.log('Insert result detail', JSON.stringify(insertData));
          if (Array.isArray(insertData) && insertData.length > 0) {
            const rows = insertData as Array<Record<string, unknown>>;
            const ids: Array<number | string | null> = [];
            for (const r of rows) {
              if (r && typeof r === 'object' && 'id' in r) {
                const idVal = r['id'];
                ids.push(typeof idVal === 'number' || typeof idVal === 'string' ? idVal : null);
              } else {
                ids.push(null);
              }
            }
            console.log('Inserted id(s):', ids);
          }
        } catch (e) {
          console.warn('Erro ao serializar insertData', e);
        }
        toast.remove(`save-item-${idx}`);
        if (errInsert) {
          console.error('Erro no insert item', idx, errInsert);
          toast.error('Erro ao salvar item: ' + (errInsert.message || JSON.stringify(errInsert)));
          throw errInsert;
        }

        // 2. Atualizar Estoque Atual do Insumo (Soma ao saldo existente)
        const { data: insumoAtual, error: errSelect } = await supabase
          .from('insumos')
          .select('estoque_atual')
          .eq('id', item.insumo_id)
          .single();

        if (errSelect) {
          console.warn('Aviso: erro ao selecionar insumoAtual', errSelect);
        }

        const currentEstoque =
          (insumoAtual && (insumoAtual as { estoque_atual?: number }).estoque_atual) || 0;
        const novoEstoque = Number(currentEstoque) + Number(item.qtd || 0);
        console.log('Atualizando estoque', { currentEstoque, novoEstoque });

        const { data: updateData, error: errUpdate } = await supabase
          .from('insumos')
          .update({
            estoque_atual: novoEstoque,
            custo_por_ue: item.custo_unitario,
          })
          .eq('id', item.insumo_id);

        console.log('Update result', { updateData, errUpdate });
        if (errUpdate) {
          console.error('Erro ao atualizar insumo', errUpdate);
          toast.error(
            'Erro ao atualizar estoque: ' + (errUpdate.message || JSON.stringify(errUpdate))
          );
          throw errUpdate;
        }

        toast.success(`Item ${progresso} salvo`);
      }

      toast.success('Entrada de mercadoria realizada!');
      setIsModalOpen(false);
      setItensEntrada([]);
      setHeaderEntrada({ fornecedorId: '', data: new Date().toISOString().split('T')[0], nf: '' });
      void fetchDados(); // Atualiza a tabela de histórico
    } catch (error: unknown) {
      console.error('handleConfirmarEntrada erro geral', error);
      toast.error('Erro ao salvar entrada: ' + getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const totalGeral = itensEntrada.reduce((acc, item) => acc + item.total, 0);

  return (
    <div className="space-y-6 animate-fade-up">
      <Toaster position="top-right" />

      <PageHeader
        title="Controle de Estoque"
        description="Registre entradas de notas, visualize movimentações e saldo."
        icon={ArrowDownToLine}
      >
        <Button
          onClick={() => setIsModalOpen(true)}
          variant="success"
          icon={Truck}
          className="transition-colors duration-200 ease-in-out hover:opacity-80"
        >
          Nova Entrada (Nota)
        </Button>
      </PageHeader>

      {/* KPIs RÁPIDOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 uppercase font-bold">Entradas no Mês</p>
          <p className="text-xl font-bold text-green-600 flex items-center gap-2">
            <ArrowDownToLine size={18} /> {movimentacoes.filter((m) => m.tipo === 'entrada').length}{' '}
            Notas
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 uppercase font-bold">Saídas (Produção)</p>
          <p className="text-xl font-bold text-orange-600 flex items-center gap-2">
            <Package size={18} /> {movimentacoes.filter((m) => m.tipo === 'saida').length} Baixas
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 uppercase font-bold">Última Movimentação</p>
          <p className="text-sm font-bold text-slate-700 mt-1">
            {movimentacoes[0]
              ? new Date(movimentacoes[0].created_at).toLocaleDateString()
              : 'Sem dados'}
          </p>
        </div>
      </div>

      {/* TABELA DE HISTÓRICO */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-3">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <FileText size={18} /> Últimas Movimentações
          </h3>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              className="w-full pl-9 pr-4 py-1.5 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-orange-100"
              placeholder="Buscar histórico..."
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500 bg-white border-b text-xs uppercase">
              <tr>
                <th className="px-6 py-3">Data</th>
                <th className="px-6 py-3">Tipo</th>
                <th className="px-6 py-3">Fornecedor / NF</th>
                <th className="px-6 py-3">Insumo</th>
                <th className="px-6 py-3 text-right">Qtd</th>
                <th className="px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movimentacoes.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Nenhum histórico encontrado.
                  </td>
                </tr>
              )}
              {movimentacoes.map((mov) => (
                <tr key={mov.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                    {new Date(mov.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    {mov.tipo === 'entrada' ? (
                      <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-1 rounded-full text-xs font-bold">
                        <ArrowDownToLine size={12} /> Entrada
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-orange-700 bg-orange-50 px-2 py-1 rounded-full text-xs font-bold">
                        <ArrowUpRight size={12} /> Saída
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {mov.fornecedor ? `${mov.fornecedor} ${mov.nf ? `(NF: ${mov.nf})` : ''}` : '-'}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-800">
                    {mov.insumo?.nome || 'Insumo excluído'}
                  </td>
                  <td
                    className={`px-6 py-4 text-right font-bold ${mov.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {mov.tipo === 'entrada' ? '+' : '-'}
                    {mov.quantidade} {mov.insumo?.unidade_estoque}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canManageMovimentacoes ? (
                        <button
                          onClick={() => {
                            setEditingMovimentacao(mov);
                            setEditNF(mov.nf || '');
                            setEditQuantidade(String(mov.quantidade || 0));
                            const matched = fornecedores.find(
                              (f) => f.label === (mov.fornecedor || '')
                            );
                            setEditFornecedorId(matched ? matched.value : '');
                            setIsEditModalOpen(true);
                          }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Editar"
                        >
                          <Edit size={18} />
                        </button>
                      ) : null}
                      {canManageMovimentacoes ? (
                        <button
                          onClick={() => setDeletePendingMov(mov)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE NOVA ENTRADA */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Entrada de Mercadoria (Nota)"
        size="lg"
      >
        <div className="space-y-6">
          {/* CABEÇALHO DA NOTA */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">
            <SelectField
              label="Fornecedor"
              options={fornecedores}
              value={headerEntrada.fornecedorId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setHeaderEntrada({ ...headerEntrada, fornecedorId: e.target.value || '' })
              }
            />
            <InputField
              label="Data Entrada"
              type="date"
              value={headerEntrada.data}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setHeaderEntrada({ ...headerEntrada, data: e.target.value })
              }
            />
            <InputField
              label="Nº Nota Fiscal"
              placeholder="000.000"
              value={headerEntrada.nf}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setHeaderEntrada({ ...headerEntrada, nf: e.target.value })
              }
            />
          </div>

          {/* FORM DE ADIÇÃO DE ITEM */}
          <div
            className="p-4 rounded-lg border shadow-inner"
            style={{
              backgroundColor: 'var(--secondary)',
              borderColor: 'var(--bordas-selecao-listagens)',
            }}
          >
            <div
              className="flex items-center gap-2 mb-3 font-bold text-xs uppercase"
              style={{ color: 'var(--titulo-paginas)' }}
            >
              <Plus size={14} /> Adicionar Itens da Nota
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-10 flex flex-col">
                <label className="text-xs text-slate-500 mb-1 block">Produto</label>
                <select
                  className="w-full p-2 rounded-lg border border-orange-200 text-sm bg-white outline-none focus:ring-2 focus:ring-orange-200"
                  value={itemAtual.insumo_id}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setItemAtual({ ...itemAtual, insumo_id: e.target.value })
                  }
                >
                  <option value="">Selecione o insumo...</option>
                  {insumos.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 flex flex-col">
                <label className="text-xs text-slate-500 mb-1 block">Lote (opcional)</label>
                <input
                  type="text"
                  className="w-full p-2 rounded-lg border border-orange-200 text-sm outline-none"
                  placeholder="Lote (opcional)"
                  value={itemAtual.lote}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setItemAtual({ ...itemAtual, lote: e.target.value })
                  }
                />
              </div>

              <div className="md:col-span-12">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-3">
                    <label className="text-xs text-slate-500 mb-1 block">Validade</label>
                    <input
                      type="date"
                      className="p-2 rounded-lg border border-orange-200 text-sm outline-none w-full"
                      value={itemAtual.validade}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setItemAtual({ ...itemAtual, validade: e.target.value })
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-slate-500 mb-1 block">Qtd</label>
                    <input
                      type="number"
                      className="w-full p-2 rounded-lg border border-orange-200 text-sm outline-none"
                      placeholder="0"
                      value={itemAtual.qtd}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setItemAtual({ ...itemAtual, qtd: e.target.value })
                      }
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-xs text-slate-500 mb-1 block">Custo Un. (R$)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="w-full p-2 rounded-lg border border-orange-200 text-sm outline-none"
                      placeholder={formatBRL(
                        insumos.find((i) => String(i.id) === itemAtual.insumo_id)?.custo_por_ue || 0
                      )}
                      value={itemAtual.custo ? formatBRL(itemAtual.custo) : ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setItemAtual({
                          ...itemAtual,
                          custo: parseCurrencyInputToNumberString(e.target.value),
                        })
                      }
                      onFocus={(e) => {
                        if (itemAtual.custo)
                          e.currentTarget.value = parseCurrencyInputToNumberString(
                            e.currentTarget.value
                          );
                      }}
                      onBlur={(e) => {
                        if (itemAtual.custo) e.currentTarget.value = formatBRL(itemAtual.custo);
                      }}
                    />
                  </div>
                  <div className="md:col-span-4">
                    <Button
                      onClick={handleAddItem}
                      disabled={!itemAtual.insumo_id}
                      variant="primary"
                      className="w-full h-[38px] transition-colors duration-200 ease-in-out"
                    >
                      Adicionar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* LISTA DE ITENS DO CARRINHO */}
          <div className="border rounded-lg overflow-hidden bg-white min-h-[150px]">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-medium">
                <tr>
                  <th className="p-3">Produto</th>
                  <th className="p-3">Qtd</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {itensEntrada.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-3">
                      <div className="font-medium">{item.nome}</div>
                      {(item.lote || item.validade) && (
                        <div className="text-xs text-slate-500 mt-1">
                          {item.lote ? `Lote: ${item.lote}` : ''}
                          {item.lote && item.validade ? ' • ' : ''}
                          {item.validade
                            ? `Validade: ${new Date(item.validade).toLocaleDateString()}`
                            : ''}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      {item.qtd} {item.ue}
                    </td>
                    <td className="p-3 text-right font-medium">{formatBRL(item.total)}</td>
                    <td className="p-3">
                      <button
                        onClick={() => handleRemoveItem(idx)}
                        className="text-red-400 hover:text-red-600 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {itensEntrada.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-400">
                      Nenhum item adicionado ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* FOOTER DO MODAL */}
          <div className="flex flex-col md:flex-row justify-between items-center pt-4 border-t gap-4">
            <div className="text-center md:text-left">
              <span className="text-gray-500 text-sm">Total da Nota:</span>
              <p className="text-3xl font-bold text-slate-800">{formatBRL(totalGeral)}</p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <Button
                variant="cancel"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 md:flex-none transition-colors duration-200 ease-in-out"
                disabled={false}
              >
                Cancelar
              </Button>
              <Button
                variant="success"
                onClick={handleConfirmarEntrada}
                disabled={itensEntrada.length === 0 || saving}
                loading={saving}
                icon={Check}
                className="flex-1 md:flex-none transition-colors duration-200 ease-in-out"
              >
                Confirmar Entrada
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* MODAL DE EDIÇÃO DE MOVIMENTAÇÃO (somente campos não-críticos: NF e fornecedor) */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar Movimentação"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-500">Fornecedor</label>
            <select
              className="w-full p-2 rounded-lg border border-orange-200 text-sm bg-white outline-none"
              value={editFornecedorId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setEditFornecedorId(e.target.value)
              }
            >
              <option value="">(Nenhum)</option>
              {fornecedores.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <InputField
            label="Nº Nota Fiscal"
            value={editNF}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditNF(e.target.value)}
          />
          <InputField
            label="Quantidade"
            type="number"
            value={editQuantidade}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditQuantidade(e.target.value)}
          />
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="cancel" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="success"
              onClick={async () => {
                if (!canManageMovimentacoes) {
                  toast.error('Ação não permitida');
                  return;
                }
                if (!editingMovimentacao) return;
                setProcessingEditSave(true);
                try {
                  // obtenha registro canônico para ter insumo_id e valores atuais
                  const { data: movRow, error: errMov } = await supabase
                    .from('movimentacao_estoque')
                    .select('insumo_id, quantidade, tipo')
                    .eq('id', editingMovimentacao.id)
                    .single();
                  if (errMov) throw errMov;

                  const fornecedorNome =
                    fornecedores.find((f) => f.value === editFornecedorId)?.label || null;
                  const payload: Partial<Record<string, unknown>> = {
                    observacoes: editNF || null,
                    fornecedor_id: editFornecedorId || null,
                    fornecedor: fornecedorNome || null,
                    quantidade: Number(editQuantidade) || 0,
                  };

                  // atualiza movimentação primeiro
                  const { error: errUpdateMov } = await supabase
                    .from('movimentacao_estoque')
                    .update(payload)
                    .eq('id', editingMovimentacao.id);
                  if (errUpdateMov) throw errUpdateMov;

                  // ajustar estoque do insumo com base na diferença de quantidade
                  if (movRow && movRow.insumo_id) {
                    const oldQ = Number(movRow.quantidade || 0);
                    const newQ = Number(editQuantidade || 0);
                    const delta = newQ - oldQ;

                    if (delta !== 0) {
                      const { data: insumoRow, error: errIns } = await supabase
                        .from('insumos')
                        .select('estoque_atual')
                        .eq('id', movRow.insumo_id)
                        .single();
                      if (errIns) throw errIns;

                      const currentEstoque =
                        (insumoRow && (insumoRow as { estoque_atual?: number }).estoque_atual) || 0;
                      let novoEstoque = Number(currentEstoque) + delta;
                      // se for saída, inverte o sinal (a movimentação de saída reduz estoque)
                      if (movRow.tipo === 'saida') novoEstoque = Number(currentEstoque) - delta;

                      const { error: errUpdateInsumo } = await supabase
                        .from('insumos')
                        .update({ estoque_atual: novoEstoque })
                        .eq('id', movRow.insumo_id);
                      if (errUpdateInsumo) throw errUpdateInsumo;
                    }
                  }

                  toast.success('Movimentação atualizada');
                  setIsEditModalOpen(false);
                  setEditingMovimentacao(null);
                  void fetchDados();
                } catch (e: unknown) {
                  console.error('Erro ao atualizar movimentação', e);
                  toast.error('Erro ao atualizar movimentação: ' + getErrorMessage(e));
                } finally {
                  setProcessingEditSave(false);
                }
              }}
            >
              Salvar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de confirmação de exclusão */}
      <Modal
        isOpen={!!deletePendingMov}
        onClose={() => {
          if (!processingDelete) setDeletePendingMov(null);
        }}
        title="Confirmar Exclusão"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Confirma exclusão desta movimentação? A ação ajustará o estoque automaticamente.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="cancel"
              onClick={() => setDeletePendingMov(null)}
              disabled={processingDelete}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (!canManageMovimentacoes) {
                  toast.error('Ação não permitida');
                  return;
                }
                if (!deletePendingMov) return;
                setProcessingDelete(true);
                const toastId = toast.loading(
                  'Processando exclusão... esse processo pode demorar alguns segundos.'
                );
                try {
                  // buscar registro canônico para obter insumo_id, quantidade e tipo
                  const { data: movRow, error: errMov } = await supabase
                    .from('movimentacao_estoque')
                    .select('insumo_id, quantidade, tipo')
                    .eq('id', deletePendingMov.id)
                    .single();
                  if (errMov) throw errMov;

                  // ajustar estoque com base no tipo
                  if (movRow && movRow.insumo_id) {
                    const qty = Number(movRow.quantidade || 0);
                    // para entrada, remover qty; para saída, adicionar qty
                    const delta = movRow.tipo === 'entrada' ? -qty : qty;

                    const { data: insumoRow, error: errIns } = await supabase
                      .from('insumos')
                      .select('estoque_atual')
                      .eq('id', movRow.insumo_id)
                      .single();
                    if (errIns) throw errIns;

                    const currentEstoque =
                      (insumoRow && (insumoRow as { estoque_atual?: number }).estoque_atual) || 0;
                    const novoEstoque = Number(currentEstoque) + delta;

                    const { error: errUpdateInsumo } = await supabase
                      .from('insumos')
                      .update({ estoque_atual: novoEstoque })
                      .eq('id', movRow.insumo_id);
                    if (errUpdateInsumo) throw errUpdateInsumo;
                  }

                  // excluir movimentação
                  const { error: errDelete } = await supabase
                    .from('movimentacao_estoque')
                    .delete()
                    .eq('id', deletePendingMov.id);
                  if (errDelete) throw errDelete;

                  toast.success('Movimentação excluída com sucesso', { id: toastId });
                  setDeletePendingMov(null);
                  void fetchDados();
                } catch (e: unknown) {
                  console.error('Erro ao excluir movimentação', e);
                  toast.error('Erro ao excluir movimentação: ' + getErrorMessage(e));
                } finally {
                  setProcessingDelete(false);
                  toast.dismiss();
                }
              }}
              disabled={processingDelete}
            >
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
