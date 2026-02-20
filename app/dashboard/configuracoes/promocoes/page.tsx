'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/Button';
import Loading from '@/components/ui/Loading';
import Modal from '@/components/Modal';
import { Tag, Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils/format';
import CurrencyInput from '@/components/ui/shared/CurrencyInput';
import { parseCurrency } from '@/lib/utils/currency';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';

interface Produto {
  id: string;
  nome: string;
  preco_venda: number;
}

interface ItemCombo {
  produto: Produto;
  quantidade: number;
  valor_referencia: number; // Quanto esse item custa DENTRO do combo
}

interface Promocao {
  id: string;
  nome: string;
  preco_total: number;
  ativo: boolean;
  itens?: { produto_id: string; quantidade: number }[];
}

export default function PromocoesPage() {
  const { profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [promocoes, setPromocoes] = useState<Promocao[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const confirmDialog = useConfirm();

  // Form States
  const [nome, setNome] = useState('');
  const [precoFinal, setPrecoFinal] = useState<string>('');
  const [itensCombo, setItensCombo] = useState<ItemCombo[]>([]);
  const [selectedProdId, setSelectedProdId] = useState('');

  // Carregar Dados
  useEffect(() => {
    async function loadData() {
      if (!profile?.organization_id) return;
      try {
        setLoading(true);
        // 1. Buscar Promoções
        const { data: promoData } = await supabase
          .from('promocoes')
          .select('*, itens:promocao_itens(produto_id, quantidade, valor_referencia_unitario)')
          // O filtro .eq foi removido pois o RLS já faz isso automaticamente
          .order('created_at', { ascending: false });

        setPromocoes(promoData || []);

        // 2. Buscar Produtos para o Select
        const { data: prodData } = await supabase
          .from('produtos_finais')
          .select('id, nome, preco_venda')
          .eq('organization_id', profile.organization_id)
          .eq('ativo', true)
          .eq('tipo', 'final')
          .order('nome');

        setProdutos(prodData || []);
      } catch (err) {
        console.error(err);
        toast.error('Erro ao carregar dados.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [profile]);

  // Handlers do Formulário
  const handleAddItem = () => {
    if (!selectedProdId) return;
    const produto = produtos.find((p) => p.id === selectedProdId);
    if (!produto) return;

    // Verifica se já existe
    const existe = itensCombo.find((i) => i.produto.id === selectedProdId);
    if (existe) {
      toast.error('Produto já está no combo.');
      return;
    }

    setItensCombo((prev) => [
      ...prev,
      {
        produto,
        quantidade: 1,
        valor_referencia: produto.preco_venda, // Inicia com o preço original
      },
    ]);
    setSelectedProdId('');
  };

  const handleRemoveItem = (id: string) => {
    setItensCombo((prev) => prev.filter((i) => i.produto.id !== id));
  };

  const updateItem = (id: string, field: 'quantidade' | 'valor_referencia', value: number) => {
    setItensCombo((prev) =>
      prev.map((i) => {
        if (i.produto.id === id) {
          return { ...i, [field]: value };
        }
        return i;
      })
    );
  };

  // Salvar Promoção
  const handleSave = async () => {
    if (!nome || !precoFinal || itensCombo.length === 0) {
      toast.error('Preencha nome, preço e adicione itens.');
      return;
    }

    // Garantir que temos organization_id do profile (RLS exige organização)
    if (!profile?.organization_id) {
      console.error('profile.organizacao ausente ao salvar promoção', profile);
      toast.error('Organização não carregada. Recarregue a página e tente novamente.');
      return;
    }

    try {
      const savePromise = (async () => {
        const precoNum = parseCurrency(precoFinal);

        const payload = {
          nome,
          preco_total: precoNum,
          ativo: true,
        };

        let promoId = editingId;

        if (editingId) {
          await supabase.from('promocoes').update(payload).eq('id', editingId);
          await supabase.from('promocao_itens').delete().eq('promocao_id', editingId);
        } else {
          const { data, error } = await supabase
            .from('promocoes')
            .insert(payload)
            .select()
            .single();
          if (error) throw error;
          promoId = data.id;
        }

        if (promoId) {
          const itensInsert = itensCombo.map((i) => ({
            promocao_id: promoId,
            produto_id: i.produto.id,
            quantidade: i.quantidade,
            valor_referencia_unitario: i.valor_referencia,
          }));
          await supabase.from('promocao_itens').insert(itensInsert);
        }

        return true;
      })();

      await toast.promise(savePromise as unknown as Promise<any>, {
        loading: 'Salvando promoção...',
        success: 'Promoção salva!',
        error: (err) => `Erro ao salvar promoção: ${err?.message || ''}`,
      });

      setIsModalOpen(false);
      window.location.reload(); // Refresh simples para atualizar lista
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar promoção.');
    }
  };

  const openNew = () => {
    setEditingId(null);
    setNome('');
    setPrecoFinal('');
    setItensCombo([]);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmDialog.confirm({
      title: 'Excluir Promoção',
      message: 'ATENÇÃO: Isso removerá a promoção permanentemente. Deseja continuar?',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      variant: 'danger',
    });

    if (!confirmed) return;

    const { error } = await supabase.from('promocoes').delete().eq('id', id);
    if (error) {
      console.error(error);
      toast.error('Erro ao excluir promoção.');
      return;
    }

    setPromocoes((prev) => prev.filter((p) => p.id !== id));
    toast.success('Excluído.');
  };

  if (loading) return <Loading />;

  // Calculadora de totais para o formulário
  const totalOriginal = itensCombo.reduce(
    (acc, i) => acc + i.quantidade * i.produto.preco_venda,
    0
  );
  const precoPromoNum = parseFloat(precoFinal.replace(',', '.') || '0');
  const desconto = totalOriginal - precoPromoNum;

  return (
    <div className="p-6 animate-fade-up">
      <PageHeader
        title="Promoções & Combos"
        description="Crie combos para vender no PDV."
        icon={Tag}
      >
        <Button icon={Plus} onClick={openNew}>
          Nova Promoção
        </Button>
      </PageHeader>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {promocoes.map((promo) => (
          <div
            key={promo.id}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative group hover:shadow-md transition-all"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">{promo.nome}</h3>
                <p className="text-sm text-slate-500">
                  {promo.itens?.length || 0} produtos inclusos
                </p>
              </div>
              <div className="text-right">
                <span className="block font-bold text-green-600 text-xl">
                  {formatCurrency(promo.preco_total)}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${promo.ativo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}
                >
                  {promo.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>

            <button
              onClick={() => handleDelete(promo.id)}
              className="absolute bottom-4 right-4 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
        {promocoes.length === 0 && (
          <div className="col-span-full text-center py-10 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            Nenhuma promoção cadastrada.
          </div>
        )}
      </div>

      {/* MODAL DE CRIAÇÃO/EDIÇÃO */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Editar Promoção' : 'Criar Novo Combo'}
      >
        <div className="p-4 space-y-6">
          {/* Dados Básicos */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Combo</label>
              <input
                className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="Ex: Combo Casal (2 Coxinhas + Refri)"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Preço Final (Venda)
              </label>
              <CurrencyInput
                className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:green-100 border-green-200 bg-green-50 font-bold text-green-800"
                placeholder="0,00"
                value={precoFinal}
                onChange={(v) =>
                  setPrecoFinal(typeof v === 'string' ? v : (v.target as HTMLInputElement).value)
                }
              />
            </div>

            <div className="flex flex-col justify-end pb-2">
              <span className="text-xs text-slate-500">Valor Original dos Itens:</span>
              <span className="text-sm font-medium line-through text-slate-400">
                {formatCurrency(totalOriginal)}
              </span>
              {desconto > 0 && (
                <span className="text-xs text-green-600 font-bold">
                  Desconto: {formatCurrency(desconto)}
                </span>
              )}
            </div>
          </div>

          <hr />

          {/* Adicionar Itens */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Composição do Combo
            </label>
            <div className="flex gap-2 mb-4">
              <select
                className="flex-1 border rounded-lg p-2 bg-white"
                value={selectedProdId}
                onChange={(e) => setSelectedProdId(e.target.value)}
              >
                <option value="">Selecione um produto...</option>
                {produtos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} ({formatCurrency(p.preco_venda)})
                  </option>
                ))}
              </select>
              <Button size="sm" onClick={handleAddItem} disabled={!selectedProdId} icon={Plus}>
                Adicionar
              </Button>
            </div>

            {/* Lista de Itens no Combo */}
            <div className="bg-slate-50 rounded-lg border border-slate-200 max-h-60 overflow-y-auto">
              {itensCombo.length === 0 ? (
                <p className="text-center text-slate-400 py-4 text-sm">
                  Adicione produtos para compor o combo.
                </p>
              ) : (
                itensCombo.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 border-b last:border-0">
                    <div className="flex-1">
                      <span className="text-sm font-bold text-slate-700 block">
                        {item.produto.nome}
                      </span>
                      <span className="text-xs text-slate-400">
                        Preço orig: {formatCurrency(item.produto.preco_venda)}
                      </span>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400">
                          Qtd
                        </label>
                        <input
                          type="number"
                          min="1"
                          className="w-12 text-center text-sm border rounded p-1"
                          value={item.quantidade}
                          onChange={(e) =>
                            updateItem(item.produto.id, 'quantidade', Number(e.target.value))
                          }
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <label
                          className="text-[10px] uppercase font-bold text-slate-400"
                          title="Quanto este item custará DENTRO do combo (para relatórios)"
                        >
                          Ref R$
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          className="w-16 text-center text-xs border rounded p-1 bg-white"
                          value={item.valor_referencia}
                          onChange={(e) =>
                            updateItem(item.produto.id, 'valor_referencia', Number(e.target.value))
                          }
                          title="Valor de referência unitário para este item no combo"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveItem(item.produto.id)}
                      className="text-red-400 hover:text-red-600 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              * Ajuste o "Ref R$" para distribuir o desconto corretamente nos relatórios.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} icon={Save}>
              Salvar Promoção
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
