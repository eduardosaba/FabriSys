'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Button from '@/components/Button';
import { ArrowLeft, Save, Plus } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import PageHeader from '@/components/ui/PageHeader';

interface ProdutoFinal {
  id: string;
  nome: string;
  preco_venda: number;
}

export default function NovaOrdemPage() {
  const [produtos, setProdutos] = useState<ProdutoFinal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    produto_final_id: '',
    quantidade_prevista: '',
    data_prevista: '',
  });
  const { toast } = useToast();

  const loadProdutos = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('produtos_finais')
        .select('id, nome, preco_venda')
        .order('nome');

      if (error) throw error;
      setProdutos(data || []);
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
      toast({
        title: 'Erro ao carregar produtos',
        description: 'Não foi possível carregar os produtos.',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadProdutos();
  }, [loadProdutos]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.produto_final_id || !formData.quantidade_prevista || !formData.data_prevista) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'error',
      });
      return;
    }

    setSaving(true);

    try {
      // Gerar número da OP
      const { data: lastOrder } = await supabase
        .from('ordens_producao')
        .select('numero_op')
        .order('numero_op', { ascending: false })
        .limit(1);

      const nextNumber =
        lastOrder && lastOrder[0] ? parseInt(String(lastOrder[0].numero_op)) + 1 : 1;
      const numeroOp = nextNumber.toString().padStart(4, '0');

      const { error } = await supabase.from('ordens_producao').insert({
        numero_op: numeroOp,
        produto_final_id: formData.produto_final_id,
        quantidade_prevista: parseFloat(formData.quantidade_prevista),
        data_prevista: formData.data_prevista,
        custo_previsto: 0, // Por enquanto, sem cálculo de custo
        status: 'pendente',
      });

      if (error) throw error;

      toast({
        title: 'Ordem criada',
        description: `Ordem de produção ${numeroOp} criada com sucesso.`,
        variant: 'success',
      });

      // Redirecionar para a lista
      window.location.href = '/dashboard/producao/ordens';
    } catch (err) {
      console.error('Erro ao criar ordem:', err);
      toast({
        title: 'Erro ao criar ordem',
        description: 'Não foi possível criar a ordem de produção.',
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Button
          variant="secondary"
          onClick={() => (window.location.href = '/dashboard/producao/ordens')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <PageHeader
          title="Nova Ordem de Produção"
          description="Crie uma nova ordem de produção"
          icon={Plus}
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-white p-6 shadow">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Produto Final *</label>
            <div className="relative">
              <select
                value={formData.produto_final_id}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, produto_final_id: e.target.value }))
                }
                className="w-full appearance-none rounded-md border border-gray-300 px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Selecione um produto</option>
                {produtos.map((produto) => (
                  <option key={produto.id} value={produto.id}>
                    {produto.nome}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                <svg
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Quantidade Prevista *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.quantidade_prevista}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, quantidade_prevista: e.target.value }))
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Data Prevista *</label>
            <input
              type="date"
              value={formData.data_prevista}
              onChange={(e) => setFormData((prev) => ({ ...prev, data_prevista: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => (window.location.href = '/dashboard/producao/ordens')}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Salvando...' : 'Salvar Ordem'}
          </Button>
        </div>
      </form>
    </div>
  );
}
