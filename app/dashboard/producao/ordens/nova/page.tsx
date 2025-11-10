'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Button from '@/components/Button';
import { ArrowLeft, Save } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nova Ordem de Produção</h1>
          <p className="text-gray-600">Crie uma nova ordem de produção</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Produto Final *</label>
            <select
              value={formData.produto_final_id}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, produto_final_id: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Selecione um produto</option>
              {produtos.map((produto) => (
                <option key={produto.id} value={produto.id}>
                  {produto.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data Prevista *</label>
            <input
              type="date"
              value={formData.data_prevista}
              onChange={(e) => setFormData((prev) => ({ ...prev, data_prevista: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar Ordem'}
          </Button>
        </div>
      </form>
    </div>
  );
}
