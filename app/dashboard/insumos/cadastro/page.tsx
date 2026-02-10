'use client';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Plus,
  Search,
  Edit,
  Calculator,
  Trash2,
  Loader2,
  AlertCircle,
  Package,
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';
import { supabase } from '@/lib/supabase'; // Sua configuração existente
import { useAuth } from '@/lib/auth';
import { Button, StatusBadge, Modal, InputField, SelectField } from '@/components/ui/shared';
import PageHeader from '@/components/ui/PageHeader';
import { UNIDADES_UE, UNIDADES_UC } from '@/lib/mock-data'; // Mantemos as constantes de unidades

// Tipagem inferida baseada no seu código Supabase
interface Categoria {
  id: number;
  nome: string;
}

interface Insumo {
  id: number;
  nome: string;
  unidade_estoque: string; // antigo 'ue'
  custo_por_ue: number; // antigo 'custo_ue'
  unidade_consumo: string; // antigo 'uc'
  fator_conversao: number;
  estoque_minimo_alerta: number; // antigo 'estoque_minimo'
  estoque_atual?: number; // Opcional se não vier do banco ainda
  categoria_id: number;
  categoria?: Categoria; // Join
}

export default function ProdutosPage() {
  function getErrorMessage(err: unknown) {
    if (!err) return 'Erro desconhecido';
    if (typeof err === 'string') return err;
    if (err instanceof Error) return err.message;
    if (typeof err === 'object' && err !== null) {
      const maybe = err as Record<string, unknown>;
      if ('message' in maybe && typeof maybe.message === 'string') return maybe.message;
      try {
        return JSON.stringify(maybe);
      } catch {
        return 'Erro desconhecido';
      }
    }
    return 'Erro desconhecido';
  }

  const confirmDialog = useConfirm();
  const { profile, loading: authLoading } = useAuth();
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInsumo, setEditingInsumo] = useState<Insumo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // --- BUSCAR DADOS (Insumos + Categorias) ---
  const fetchDados = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Buscar Insumos com Join de Categoria
      const { data: dataInsumos, error: errorInsumos } = await supabase
        .from('insumos')
        .select(`*, categoria:categorias(id, nome)`)
        .order('nome');

      if (errorInsumos) throw errorInsumos;

      // 2. Buscar Categorias para o Select
      // Carregar categorias apenas da organização do usuário, quando disponível
      let catQuery = supabase.from('categorias').select('id, nome').order('nome');
      if (profile?.organization_id)
        catQuery = catQuery.eq('organization_id', profile.organization_id);
      const { data: dataCategorias, error: errorCategorias } = await catQuery;

      if (errorCategorias) throw errorCategorias;

      setInsumos((dataInsumos as Insumo[]) || []);
      setCategorias((dataCategorias as Categoria[]) || []);
    } catch (error: unknown) {
      console.error('Erro ao carregar:', error);
      toast.error('Erro ao carregar dados: ' + getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDados();
  }, [fetchDados]);

  // --- SALVAR (Insert ou Update) ---
  async function handleSave(formData: Partial<Insumo>): Promise<boolean> {
    try {
      // Tratamento de dados seguro
      const payload = {
        nome: formData.nome,
        categoria_id: formData.categoria_id != null ? Number(formData.categoria_id) : undefined,
        // Mapeamos ambos: `unidade_medida` (coluna atual do DB) e
        // `unidade_estoque` (constraint presente que exige valor não vazio).
        // Assim cobrimos ambos os esquemas possíveis no banco e evitamos
        // violação da constraint `check_unidade_estoque_not_empty`.
        unidade_medida: formData.unidade_estoque || 'UN',
        unidade_estoque: formData.unidade_estoque || 'UN',
        custo_por_ue: Number(formData.custo_por_ue) || 0,
        unidade_consumo: formData.unidade_consumo || 'un',
        fator_conversao: Number(formData.fator_conversao) || 1,
        estoque_minimo_alerta: Number(formData.estoque_minimo_alerta) || 0,
        // Se for edição, não mexemos no estoque atual, se for novo, iniciamos com 0
        ...(editingInsumo ? {} : { estoque_atual: 0 }),
      };

      // Execute update or insert and capture returned rows + error
      if (editingInsumo) {
        const { data: updated, error: updateError } = await supabase
          .from('insumos')
          .update(payload)
          .eq('id', editingInsumo.id)
          .select();
        if (updateError) throw updateError;
        console.debug('Updated insumo:', updated);
      } else {
        // Ao inserir, removemos chaves undefined para evitar enviar colunas inexistentes
        const safePayload = { ...payload } as Record<string, unknown>;
        if (safePayload.categoria_id === undefined) delete safePayload.categoria_id;
        const { data: inserted, error: insertError } = await supabase
          .from('insumos')
          .insert(safePayload)
          .select();
        if (insertError) throw insertError;
        console.debug('Inserted insumo:', inserted);
      }
      toast.success(editingInsumo ? 'Insumo atualizado!' : 'Insumo cadastrado!');
      await fetchDados(); // Recarrega a lista
      return true;
    } catch (error: unknown) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar: ' + getErrorMessage(error));
      return false;
    }
  }

  // --- EXCLUIR ---
  async function handleDelete(id: number) {
    const confirmed = await confirmDialog.confirm({
      title: 'Excluir Insumo',
      message: 'Tem certeza que deseja excluir este insumo? Esta ação não pode ser desfeita.',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase.from('insumos').delete().eq('id', id);
      if (error) throw error;

      toast.success('Insumo excluído');
      setInsumos(insumos.filter((i) => i.id !== id));
    } catch (error: unknown) {
      console.error('Erro ao excluir:', error);
      const msg = getErrorMessage(error);
      // Tentativa de detectar código de PG no objeto retornado
      if (typeof error === 'object' && error !== null) {
        const maybe = error as Record<string, unknown>;
        if ('code' in maybe && maybe.code === '23503') {
          toast.error(
            'Não é possível excluir: Existem lotes ou fichas técnicas usando este insumo.'
          );
          return;
        }
      }
      toast.error('Erro ao excluir: ' + msg);
    }
  }

  // --- COMPONENTE DE FORMULÁRIO INTERNO ---
  const InsumoForm = ({
    initialData,
    onClose,
    onSave,
    categoriasLista,
  }: {
    initialData?: Partial<Insumo> | null;
    onClose: () => void;
    onSave: (payload: Partial<Insumo>) => Promise<boolean>;
    categoriasLista: Categoria[];
  }) => {
    const [form, setForm] = useState(() => {
      if (initialData) {
        return {
          nome: initialData.nome ?? '',
          categoria_id: initialData.categoria_id != null ? String(initialData.categoria_id) : '',
          unidade_estoque: initialData.unidade_estoque ?? 'UN',
          custo_por_ue: initialData.custo_por_ue ?? '',
          unidade_consumo: initialData.unidade_consumo ?? 'g',
          fator_conversao: initialData.fator_conversao ?? '',
          estoque_minimo_alerta: initialData.estoque_minimo_alerta ?? '',
        };
      }
      return {
        nome: '',
        categoria_id: '',
        unidade_estoque: 'UN',
        custo_por_ue: '',
        unidade_consumo: 'g',
        fator_conversao: '',
        estoque_minimo_alerta: '',
      };
    });
    const [savingLocal, setSavingLocal] = useState(false);

    const custoPorUC = useMemo(() => {
      const custo = parseFloat(String(form.custo_por_ue));
      const fator = parseFloat(String(form.fator_conversao));
      if (!custo || !fator) return 0;
      return custo / fator;
    }, [form.custo_por_ue, form.fator_conversao]);

    const handleSubmit = async () => {
      if (!form.nome || form.categoria_id === '') {
        toast.error('Preencha o nome e a categoria.');
        return;
      }
      setSavingLocal(true);
      // Converte categoria_id para number antes de enviar
      const payload: Partial<Insumo> = {
        nome: form.nome,
        categoria_id: form.categoria_id === '' ? undefined : Number(form.categoria_id),
        unidade_estoque: form.unidade_estoque,
        custo_por_ue: form.custo_por_ue === '' ? undefined : Number(form.custo_por_ue),
        unidade_consumo: form.unidade_consumo,
        fator_conversao: form.fator_conversao === '' ? undefined : Number(form.fator_conversao),
        estoque_minimo_alerta:
          form.estoque_minimo_alerta === '' ? undefined : Number(form.estoque_minimo_alerta),
      };

      const ok = await onSave(payload);
      setSavingLocal(false);
      if (ok) {
        onClose();
      }
    };

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <InputField
              label="Nome do Insumo"
              value={form.nome}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setForm({ ...form, nome: e.target.value })
              }
              placeholder="Ex: Leite Condensado"
            />
          </div>
          <div className="w-full">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Categoria</label>
            <div className="relative">
              <select
                className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                value={form.categoria_id}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setForm({ ...form, categoria_id: e.target.value })
                }
              >
                <option value="">Selecione...</option>
                {categoriasLista.map((cat: Categoria) => (
                  <option key={cat.id} value={String(cat.id)}>
                    {cat.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <SelectField
            label="Unidade (UE)"
            options={UNIDADES_UE}
            value={form.unidade_estoque}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setForm({ ...form, unidade_estoque: e.target.value })
            }
          />
          <InputField
            label="Custo por UE"
            type="number"
            step="0.01"
            prefix="R$"
            value={form.custo_por_ue}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setForm({ ...form, custo_por_ue: e.target.value })
            }
          />
          <div className="col-span-2 md:col-span-1">
            <InputField
              label="Estoque Mínimo"
              type="number"
              value={form.estoque_minimo_alerta}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setForm({ ...form, estoque_minimo_alerta: e.target.value })
              }
            />
          </div>
        </div>

        <div
          className="p-4 rounded-lg border transition-transform duration-150 ease-out hover:-translate-y-1 hover:shadow-md"
          style={{ background: 'var(--secondary)', borderColor: 'var(--primary)' }}
        >
          <div
            className="flex items-center gap-2 mb-3 font-medium text-sm"
            style={{ color: 'var(--titulo-paginas)', transition: 'color 150ms ease' }}
          >
            <Calculator size={16} />
            <span>Conversão Inteligente</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
            <SelectField
              label="Unidade Consumo (UC)"
              options={UNIDADES_UC}
              value={form.unidade_consumo}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setForm({ ...form, unidade_consumo: e.target.value })
              }
            />
            <InputField
              label={`Qtd de ${form.unidade_consumo || 'UC'} na ${form.unidade_estoque || 'UE'}`}
              type="number"
              placeholder="Ex: 395"
              className="bg-white"
              value={form.fator_conversao}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setForm({ ...form, fator_conversao: e.target.value })
              }
            />
          </div>
          <div
            className="text-xs mt-2 text-center font-medium"
            style={{ color: 'var(--texto-geral-hover)' }}
          >
            Custo Real: R$ {custoPorUC.toFixed(4)} por {form.unidade_consumo || 'unidade'}.
          </div>
        </div>

        <div className="pt-4 flex gap-3">
          <Button variant="cancel" onClick={onClose} className="flex-1 py-3">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={savingLocal} className="flex-1 py-3">
            Salvar Dados
          </Button>
        </div>
      </div>
    );
  };

  const filteredInsumos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return insumos.filter((item) => {
      if (categoryFilter && String(item.categoria_id) !== categoryFilter) return false;
      if (!q) return true;
      const nome = (item.nome || '').toLowerCase();
      const categoriaNome = (item.categoria?.nome || '').toLowerCase();
      return nome.includes(q) || categoriaNome.includes(q);
    });
  }, [insumos, searchQuery, categoryFilter]);

  return (
    <div className="space-y-6 animate-fade-up">
      <Toaster position="top-right" />

      <PageHeader
        title="Produtos & Insumos"
        description="Gerencie suas matérias-primas e custos."
        icon={Package}
      >
        <Button
          onClick={() => {
            setEditingInsumo(null);
            setIsModalOpen(true);
          }}
          icon={Plus}
        >
          Novo Produto
        </Button>
      </PageHeader>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b flex gap-4 flex-col md:flex-row">
          <div className="relative flex-1 flex gap-3 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Buscar insumo ou produto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all"
              />
            </div>

            <div className="w-56">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              >
                <option value="">Todas as categorias</option>
                {categorias.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-slate-400">
            <Loader2 className="animate-spin mr-2" /> Carregando insumos...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3">Produto</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3">Estoque (UE)</th>
                  <th className="px-6 py-3 text-right">Custo (UE)</th>
                  <th className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInsumos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      {insumos.length === 0
                        ? 'Nenhum insumo cadastrado.'
                        : 'Nenhum insumo encontrado para esta busca.'}
                    </td>
                  </tr>
                ) : (
                  filteredInsumos.map((item) => {
                    const estoque = item.estoque_atual || 0;
                    const minimo = item.estoque_minimo_alerta || 0;
                    let status = 'ok';
                    if (estoque <= minimo) status = 'critico';
                    else if (estoque <= minimo * 1.2) status = 'alerta';

                    const custoNumero = Number(item.custo_por_ue ?? 0) || 0;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-800">{item.nome}</p>
                          {item.categoria && (
                            <p className="text-xs text-slate-500 bg-slate-100 inline-block px-1.5 py-0.5 rounded mt-1 border border-slate-200">
                              {item.categoria.nome}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <StatusBadge status={status} />
                        </td>
                        <td className="px-6 py-4 font-medium">
                          {estoque}{' '}
                          <span className="text-xs text-slate-500">{item.unidade_estoque}</span>
                          {estoque <= minimo && (
                            <div className="flex items-center text-xs text-red-500 mt-1 font-medium">
                              <AlertCircle size={12} className="mr-1" /> Repor
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right text-slate-600">
                          R$ {custoNumero.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingInsumo(item);
                                setIsModalOpen(true);
                              }}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              title="Editar"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Excluir"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingInsumo(null);
        }}
        title={editingInsumo ? 'Editar Insumo' : 'Novo Insumo'}
      >
        <InsumoForm
          initialData={editingInsumo}
          categoriasLista={categorias}
          onClose={() => {
            setIsModalOpen(false);
            setEditingInsumo(null);
          }}
          onSave={handleSave}
        />
      </Modal>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={confirmDialog.handleCancel}
        onConfirm={confirmDialog.handleConfirm}
        title={confirmDialog.options.title}
        message={confirmDialog.options.message}
        confirmText={confirmDialog.options.confirmText}
        cancelText={confirmDialog.options.cancelText}
        variant={confirmDialog.options.variant}
      />
    </div>
  );
}
