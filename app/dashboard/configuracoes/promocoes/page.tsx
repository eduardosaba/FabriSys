'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/Button';
import { Tag, Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';
import { Modal, InputField, SelectField } from '@/components/ui/shared';

interface Promocao {
  id: string;
  nome: string;
  qtd_gatilho: number;
  preco_final: number;
  produto_id: string;
  produto?: { nome: string; preco_venda: number };
}

export default function PromocoesPage() {
  const confirmDialog = useConfirm();
  const [promocoes, setPromocoes] = useState<Promocao[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form
  const [form, setForm] = useState({
    nome: '',
    produto_id: '',
    qtd_gatilho: 2,
    preco_final: 0,
  });

  const carregar = async () => {
    // Carregar Promoções
    const { data: promos } = await supabase
      .from('promocoes')
      .select('*, produto:produtos_finais(nome, preco_venda)')
      .eq('ativo', true)
      .order('nome');

    // Normaliza produto (pode vir como array)
    const normalizedPromos = (promos || []).map((p: any) => ({
      ...p,
      produto: Array.isArray(p.produto) ? p.produto[0] : p.produto,
    }));
    setPromocoes(normalizedPromos);

    // Carregar Produtos para Select
    const { data: prods } = await supabase
      .from('produtos_finais')
      .select('id, nome, preco_venda')
      .eq('ativo', true)
      .order('nome');
    setProdutos(prods || []);
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleSave = async () => {
    if (!form.nome || !form.produto_id) return toast.error('Preencha os campos');

    // Validar se é realmente uma promoção
    const prod = produtos.find((p) => p.id === form.produto_id);
    const precoNormal = prod ? prod.preco_venda * form.qtd_gatilho : 0;

    if (form.preco_final >= precoNormal) {
      return toast.error(
        `O preço final deve ser menor que o normal (R$ ${precoNormal.toFixed(2)})`
      );
    }

    setLoading(true);
    const { error } = await supabase.from('promocoes').insert({
      nome: form.nome,
      produto_id: form.produto_id,
      qtd_gatilho: Number(form.qtd_gatilho),
      preco_final: Number(form.preco_final),
    });
    setLoading(false);

    if (error) toast.error('Erro ao salvar');
    else {
      toast.success('Promoção criada!');
      setIsModalOpen(false);
      carregar();
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmDialog.confirm({
      title: 'Excluir Promoção',
      message: 'Tem certeza que deseja excluir esta promoção? Ela será desativada.',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      variant: 'warning',
    });

    if (!confirmed) return;
    await supabase.from('promocoes').update({ ativo: false }).eq('id', id);
    carregar();
  };

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-up">
      <PageHeader
        title="Regras de Promoções"
        description="Defina combos e descontos permitidos no PDV."
        icon={Tag}
      >
        <Button icon={Plus} onClick={() => setIsModalOpen(true)}>
          Nova Promoção
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {promocoes.map((promo) => {
          const precoNormal = (promo.produto?.preco_venda || 0) * promo.qtd_gatilho;
          const desconto = precoNormal - promo.preco_final;

          return (
            <div
              key={promo.id}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative group"
            >
              <button
                onClick={() => handleDelete(promo.id)}
                className="absolute top-4 right-4 text-slate-300 hover:text-red-500"
              >
                <Trash2 size={18} />
              </button>

              <div className="flex items-center gap-2 mb-2">
                <Tag size={20} className="text-pink-500" />
                <h3 className="font-bold text-slate-800">{promo.nome}</h3>
              </div>

              <div className="text-sm text-slate-600 mb-3">
                <p>
                  Item: <strong>{promo.produto?.nome}</strong>
                </p>
                <p>
                  Leve <strong>{promo.qtd_gatilho}</strong> por{' '}
                  <strong>R$ {promo.preco_final.toFixed(2)}</strong>
                </p>
              </div>

              <div className="bg-green-50 text-green-700 text-xs font-bold px-2 py-1 rounded inline-block">
                Desconto: R$ {desconto.toFixed(2)} / combo
              </div>
            </div>
          );
        })}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Criar Promoção">
        <div className="space-y-4">
          <InputField
            label="Nome da Promoção"
            placeholder="Ex: 3 Brigadeiros por 10"
            value={form.nome}
            onChange={(e: any) => setForm({ ...form, nome: e.target.value })}
          />

          <div>
            <label className="text-sm font-medium text-slate-700">Produto</label>
            <select
              className="w-full border p-2 rounded-lg"
              value={form.produto_id}
              onChange={(e) => setForm({ ...form, produto_id: e.target.value })}
            >
              <option value="">Selecione...</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} (R$ {p.preco_venda})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InputField
              type="number"
              label="Qtd no Combo"
              value={form.qtd_gatilho}
              onChange={(e: any) => setForm({ ...form, qtd_gatilho: e.target.value })}
            />
            <InputField
              type="number"
              label="Preço Final do Combo"
              value={form.preco_final}
              onChange={(e: any) => setForm({ ...form, preco_final: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={loading}>
              Salvar
            </Button>
          </div>
        </div>
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
