'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import {
  Edit,
  Trash2,
  FileText,
  Loader2,
  Plus,
  Box,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Tag,
  LayoutGrid,
  LayoutList,
  Camera,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';
import { ProdutoFinal } from '@/lib/types/producao';
import Modal from '@/components/Modal';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabase';
import { useTableFilters } from '@/hooks/useTableFilters';
import TableControls from '@/components/ui/TableControls';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';

interface ListaProdutosProps {
  produtos: ProdutoFinal[];
  onUpdate: () => void;
}

export default function ListaProdutos({ produtos, onUpdate }: ListaProdutosProps) {
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProdutoFinal | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('produtos_view_mode');
      if (saved === 'grid' || saved === 'table') return saved;
    }
    return 'grid';
  });
  const { toast } = useToast();

  const handleQuickImageUpload = async (produtoId: string, file: File) => {
    try {
      setUploadingId(produtoId);
      const fileExt = file.name.split('.').pop();
      const filePath = `produtos/${produtoId}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('produtos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('produtos').getPublicUrl(filePath);
      const imagem_url = publicUrlData.publicUrl;

      const { error: updateError } = await supabase
        .from('produtos_finais')
        .update({ imagem_url })
        .eq('id', produtoId);

      if (updateError) throw updateError;

      toast({
        title: 'Foto do produto atualizada!',
        description: 'A imagem foi alterada com sucesso.',
        variant: 'success',
      });
      onUpdate();
    } catch (err: any) {
      console.error('Erro ao atualizar foto:', err);
      toast({
        title: 'Erro ao enviar imagem',
        description: err?.message || 'Falha ao atualizar a foto.',
        variant: 'error',
      });
    } finally {
      setUploadingId(null);
    }
  };

  const handleViewModeChange = (mode: 'table' | 'grid') => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('produtos_view_mode', mode);
    }
  };

  // Usar o hook de filtros com paginação
  const filters = useTableFilters(produtos, {
    searchFields: ['nome', 'descricao', 'codigo_interno'],
    itemsPerPage: 10,
    enablePagination: true,
  });

  // Cálculo de KPIs dos produtos
  const kpis = useMemo(() => {
    const total = produtos.length;
    const ativos = produtos.filter((p) => p.ativo).length;
    const inativos = total - ativos;

    const produtosComCmp = produtos.filter(
      (p) => p.preco_venda > 0 && typeof p.cmp === 'number' && p.cmp > 0
    );
    const margemMedia =
      produtosComCmp.length > 0
        ? (produtosComCmp.reduce(
            (acc, p) => acc + ((p.preco_venda - (p.cmp || 0)) / p.preco_venda) * 100,
            0
          ) / produtosComCmp.length)
        : 0;

    return { total, ativos, inativos, margemMedia };
  }, [produtos]);

  async function handleDelete() {
    if (!selectedProduct) return;

    setDeletingProductId(selectedProduct.id);
    try {
      const { error } = await supabase
        .from('produtos_finais')
        .delete()
        .eq('id', selectedProduct.id);

      if (error) throw error;

      toast({
        title: 'Produto excluído',
        description: 'Produto removido com sucesso.',
        variant: 'success',
      });

      onUpdate();
    } catch {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o produto.',
        variant: 'error',
      });
    } finally {
      setDeleteModal(false);
      setSelectedProduct(null);
      setDeletingProductId(null);
    }
  }

  function handleViewFicha(produto: ProdutoFinal) {
    window.location.href = `/dashboard/producao/produtos/${produto.id}/ficha-tecnica`;
  }

  const calcMargem = (preco: number, cmp: number | null | undefined) => {
    if (!preco || preco <= 0 || !cmp || cmp <= 0) return null;
    const lucro = preco - cmp;
    const percentual = (lucro / preco) * 100;
    return { lucro, percentual };
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards de Resumo */}
      {produtos.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total de Produtos
              </span>
              <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                <Box className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900">{kpis.total}</div>
            <p className="mt-1 text-xs text-slate-500">Cadastrados no sistema</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Produtos Ativos
              </span>
              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-600">{kpis.ativos}</div>
            <p className="mt-1 text-xs text-slate-500">Disponíveis para venda/OP</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Inativos
              </span>
              <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
                <XCircle className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-slate-700">{kpis.inativos}</div>
            <p className="mt-1 text-xs text-slate-500">Desativados ou arquivados</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Margem Média
              </span>
              <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-purple-700">
              {kpis.margemMedia > 0 ? `${kpis.margemMedia.toFixed(1)}%` : '-'}
            </div>
            <p className="mt-1 text-xs text-slate-500">Com base no CMP cadastrado</p>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Controles de busca, filtro e alternador de visualização */}
        {produtos.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 bg-slate-50/50">
            <div className="flex-1">
              <TableControls
                filters={filters}
                searchPlaceholder="Buscar por nome, código ou descrição..."
                showStatusFilter={true}
                className="border-b-0"
              />
            </div>
            <div className="flex items-center gap-1.5 px-4 pb-3 sm:pb-0 sm:pr-4 justify-end">
              <span className="text-xs font-bold text-slate-500 mr-1 hidden sm:inline">Modo:</span>
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => handleViewModeChange('table')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                    viewMode === 'table'
                      ? 'bg-[#88544c] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Visualizar em Tabela"
                >
                  <LayoutList className="h-3.5 w-3.5" />
                  Tabela
                </button>
                <button
                  type="button"
                  onClick={() => handleViewModeChange('grid')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                    viewMode === 'grid'
                      ? 'bg-[#88544c] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Visualizar em Grade (Cards)"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Grade
                </button>
              </div>
            </div>
          </div>
        )}

        {filters.filteredItems.length === 0 && produtos.length > 0 ? (
          <EmptyState
            type="no-results"
            title="Nenhum produto encontrado"
            description="Tente ajustar os termos da busca ou selecionar outro status."
          />
        ) : filters.filteredItems.length === 0 ? (
          <EmptyState
            type="no-data"
            title="Nenhum produto cadastrado"
            description="Comece criando o primeiro produto final para seu sistema de produção."
            action={{
              label: 'Criar primeiro produto',
              onClick: () => (window.location.href = '/dashboard/producao/produtos/novo'),
              icon: <Plus className="h-5 w-5" />,
            }}
          />
        ) : (
          <>
            {viewMode === 'grid' ? (
              /* Visualização em Grade (Cards) */
              <div className="p-4 bg-slate-50/30">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filters.paginatedItems.map((produto) => {
                    const margem = calcMargem(produto.preco_venda, produto.cmp);
                    const catNome = (produto as any).categoria || (produto as any).categorias?.nome;
                    return (
                      <div
                        key={produto.id}
                        className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-xs hover:shadow-md transition-all hover:border-amber-300"
                      >
                        <div>
                          {/* Imagem + Badges + Upload Rápido */}
                          <div className="relative mb-3 h-36 w-full overflow-hidden rounded-lg bg-slate-100 border border-slate-100 flex items-center justify-center group/img">
                            {produto.imagem_url ? (
                              <Image
                                src={produto.imagem_url}
                                alt={produto.nome}
                                fill
                                className="object-cover group-hover/img:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <Box className="h-10 w-10 text-slate-300" />
                            )}
                            <span
                              className={`absolute top-2 right-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold backdrop-blur-md shadow-xs ${
                                produto.ativo
                                  ? 'bg-emerald-600/90 text-white'
                                  : 'bg-slate-700/80 text-white'
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  produto.ativo ? 'bg-white' : 'bg-slate-300'
                                }`}
                              />
                              {produto.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                            {catNome && (
                              <span className="absolute top-2 left-2 inline-flex items-center rounded-md bg-white/95 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-200/60 shadow-xs">
                                {catNome}
                              </span>
                            )}
                            {/* Overlay de troca rápida de foto */}
                            <label
                              htmlFor={`upload-grid-${produto.id}`}
                              className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-lg bg-black/70 backdrop-blur-md px-2.5 py-1 text-[11px] font-bold text-white opacity-0 group-hover/img:opacity-100 hover:bg-[#88544c] cursor-pointer transition-all shadow-md z-10"
                              title="Trocar Foto do Produto"
                            >
                              {uploadingId === produto.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Camera className="h-3.5 w-3.5" />
                              )}
                              <span>{uploadingId === produto.id ? 'Enviando...' : 'Trocar Foto'}</span>
                              <input
                                type="file"
                                id={`upload-grid-${produto.id}`}
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingId === produto.id}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleQuickImageUpload(produto.id, f);
                                }}
                              />
                            </label>
                          </div>

                          {/* Info do produto */}
                          <div className="space-y-1">
                            <h4 className="text-base font-bold text-slate-900 line-clamp-1 group-hover:text-[#88544c] transition-colors">
                              {produto.nome}
                            </h4>
                            {produto.codigo_interno && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                <Tag className="h-3 w-3 text-slate-400" />
                                {produto.codigo_interno}
                              </span>
                            )}
                            {produto.descricao && (
                              <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                                {produto.descricao}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Preços e Ações */}
                        <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                Preço
                              </span>
                              <span className="text-lg font-black text-[#88544c]">
                                {formatCurrency(produto.preco_venda)}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                CMP / Margem
                              </span>
                              <div className="flex items-center justify-end gap-1 text-xs">
                                <span className="font-bold text-slate-700">
                                  {produto.cmp ? formatCurrency(produto.cmp) : '-'}
                                </span>
                                {margem && (
                                  <span
                                    className={`font-extrabold ${
                                      margem.percentual >= 30
                                        ? 'text-emerald-600'
                                        : margem.percentual >= 15
                                          ? 'text-amber-600'
                                          : 'text-red-600'
                                    }`}
                                  >
                                    ({margem.percentual.toFixed(0)}%)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Botões de ação */}
                          <div className="grid grid-cols-3 gap-1.5 pt-1">
                            <button
                              onClick={() => handleViewFicha(produto)}
                              className="inline-flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors"
                              title="Ficha Técnica"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Ficha
                            </button>
                            <button
                              onClick={() =>
                                (window.location.href = `/dashboard/producao/produtos/${produto.id}`)
                              }
                              className="inline-flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors"
                              title="Editar Produto"
                            >
                              <Edit className="h-3.5 w-3.5" />
                              Editar
                            </button>
                            <button
                              onClick={() => {
                                setSelectedProduct(produto);
                                setDeleteModal(true);
                              }}
                              className="inline-flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-100 hover:bg-red-100 transition-colors"
                              title="Excluir Produto"
                              disabled={deletingProductId === produto.id}
                            >
                              {deletingProductId === produto.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                              Excluir
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                {/* Mobile Cards */}
                <div className="block sm:hidden divide-y divide-slate-100">
                  <ul className="divide-y divide-slate-100">
                    {filters.paginatedItems.map((produto) => {
                      const margem = calcMargem(produto.preco_venda, produto.cmp);
                      return (
                        <li key={produto.id} className="p-4 space-y-3 hover:bg-slate-50/50">
                          <div className="flex items-start gap-3">
                            <div className="relative flex-shrink-0 h-14 w-14 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center group/thumb">
                              {produto.imagem_url ? (
                                <Image
                                  src={produto.imagem_url}
                                  alt={produto.nome}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <Box className="h-6 w-6 text-slate-400" />
                              )}
                              <label
                                htmlFor={`upload-mobile-${produto.id}`}
                                className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity cursor-pointer text-white rounded-lg z-10"
                                title="Trocar Foto"
                              >
                                {uploadingId === produto.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Camera className="h-4 w-4" />
                                )}
                                <input
                                  type="file"
                                  id={`upload-mobile-${produto.id}`}
                                  accept="image/*"
                                  className="hidden"
                                  disabled={uploadingId === produto.id}
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) handleQuickImageUpload(produto.id, f);
                                  }}
                                />
                              </label>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <h4 className="text-sm font-bold text-slate-900 truncate">
                                    {produto.nome}
                                  </h4>
                                  {((produto as any).categoria || (produto as any).categorias?.nome) && (
                                    <span className="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                                      {(produto as any).categoria || (produto as any).categorias?.nome}
                                    </span>
                                  )}
                                </div>
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                    produto.ativo
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                                  }`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${produto.ativo ? 'bg-emerald-500' : 'bg-slate-400'}`}
                                  />
                                  {produto.ativo ? 'Ativo' : 'Inativo'}
                                </span>
                              </div>
                              {produto.codigo_interno && (
                                <div className="mt-0.5 text-xs text-slate-500 font-mono">
                                  Cód: {produto.codigo_interno}
                                </div>
                              )}
                              {produto.descricao && (
                                <p className="mt-1 text-xs text-slate-600 line-clamp-2">
                                  {produto.descricao}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <span className="text-slate-500 block">Preço de Venda</span>
                              <span className="font-black text-slate-900 text-sm">
                                {formatCurrency(produto.preco_venda)}
                              </span>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <span className="text-slate-500 block">Custo (CMP) / Margem</span>
                              <div className="flex items-center justify-between font-medium">
                                <span className="text-slate-700">
                                  {produto.cmp ? formatCurrency(produto.cmp) : '-'}
                                </span>
                                {margem && (
                                  <span
                                    className={`font-bold ${
                                      margem.percentual >= 30
                                        ? 'text-emerald-600'
                                        : margem.percentual >= 15
                                          ? 'text-amber-600'
                                          : 'text-red-600'
                                    }`}
                                  >
                                    {margem.percentual.toFixed(0)}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              onClick={() => handleViewFicha(produto)}
                              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 hover:bg-blue-100"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Ficha
                            </button>
                            <button
                              onClick={() =>
                                (window.location.href = `/dashboard/producao/produtos/${produto.id}`)
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 hover:bg-amber-100"
                            >
                              <Edit className="h-3.5 w-3.5" />
                              Editar
                            </button>
                            <button
                              onClick={() => {
                                setSelectedProduct(produto);
                                setDeleteModal(true);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-100 hover:bg-red-100"
                              disabled={deletingProductId === produto.id}
                            >
                              {deletingProductId === produto.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                              Excluir
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Desktop Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50/80">
                      <tr>
                        <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                          Produto
                        </th>
                        <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                          Código
                        </th>
                        <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                          Preço Venda
                        </th>
                        <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                          CMP (Custo)
                        </th>
                        <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                          Margem Est.
                        </th>
                        <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                          Status
                        </th>
                        <th className="px-6 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filters.paginatedItems.map((produto) => {
                        const margem = calcMargem(produto.preco_venda, produto.cmp);
                        return (
                          <tr key={produto.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3.5">
                                <div className="relative h-11 w-11 flex-shrink-0 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shadow-xs group/thumb">
                                  {produto.imagem_url ? (
                                    <Image
                                      src={produto.imagem_url}
                                      alt={produto.nome}
                                      fill
                                      className="object-cover"
                                    />
                                  ) : (
                                    <Box className="h-5 w-5 text-slate-400" />
                                  )}
                                  <label
                                    htmlFor={`upload-table-${produto.id}`}
                                    className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity cursor-pointer text-white rounded-lg z-10"
                                    title="Trocar Foto"
                                  >
                                    {uploadingId === produto.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Camera className="h-3.5 w-3.5" />
                                    )}
                                    <input
                                      type="file"
                                      id={`upload-table-${produto.id}`}
                                      accept="image/*"
                                      className="hidden"
                                      disabled={uploadingId === produto.id}
                                      onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) handleQuickImageUpload(produto.id, f);
                                      }}
                                    />
                                  </label>
                                </div>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-sm font-bold text-slate-900 truncate">
                                      {produto.nome}
                                    </span>
                                    {((produto as any).categoria || (produto as any).categorias?.nome) && (
                                      <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                                        {(produto as any).categoria || (produto as any).categorias?.nome}
                                      </span>
                                    )}
                                    {produto.tipo === 'semi_acabado' && (
                                      <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200">
                                        Semi-Acabado
                                      </span>
                                    )}
                                  </div>
                                  {produto.descricao && (
                                    <div className="text-xs text-slate-500 truncate max-w-xs">
                                      {produto.descricao}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-6 py-4">
                              {produto.codigo_interno ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-mono font-bold text-slate-700 border border-slate-200">
                                  <Tag className="h-3 w-3 text-slate-400" />
                                  {produto.codigo_interno}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">-</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4">
                              <span className="text-sm font-black text-slate-900">
                                {formatCurrency(produto.preco_venda)}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700 font-medium">
                              {produto.cmp ? (
                                formatCurrency(produto.cmp)
                              ) : (
                                <span className="text-xs text-slate-400">Não calc.</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4">
                              {margem ? (
                                <div className="flex flex-col">
                                  <span
                                    className={`inline-flex items-center gap-1 w-fit rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
                                      margem.percentual >= 30
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : margem.percentual >= 15
                                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                          : 'bg-red-50 text-red-700 border border-red-200'
                                    }`}
                                  >
                                    <TrendingUp className="h-3 w-3" />
                                    {margem.percentual.toFixed(1)}%
                                  </span>
                                  <span className="text-[10px] text-slate-400 mt-0.5 font-medium">
                                    Lucro: {formatCurrency(margem.lucro)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">-</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                                  produto.ativo
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${produto.ativo ? 'bg-emerald-500' : 'bg-slate-400'}`}
                                />
                                {produto.ativo ? 'Ativo' : 'Inativo'}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => handleViewFicha(produto)}
                                  className="inline-flex h-8 px-2.5 items-center gap-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors"
                                  title="Ficha Técnica"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  Ficha
                                </button>
                                <button
                                  onClick={() =>
                                    (window.location.href = `/dashboard/producao/produtos/${produto.id}`)
                                  }
                                  className="inline-flex h-8 px-2.5 items-center gap-1.5 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 hover:bg-amber-100 transition-colors"
                                  title="Editar Produto"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                  Editar
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedProduct(produto);
                                    setDeleteModal(true);
                                  }}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 hover:text-red-800 transition-colors"
                                  title="Excluir Produto"
                                  disabled={deletingProductId === produto.id}
                                >
                                  {deletingProductId === produto.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Paginação para ambos os modos (Tabela e Grade) */}
            {filters.resultCount > 0 && (
              <Pagination
                currentPage={filters.currentPage}
                totalPages={filters.totalPages}
                onPageChange={filters.setCurrentPage}
                itemsPerPage={filters.itemsPerPage}
                onItemsPerPageChange={filters.setItemsPerPage}
                totalItems={filters.resultCount}
              />
            )}
          </>
        )}
      </div>

      <Modal
        isOpen={deleteModal}
        onClose={() => {
          if (deletingProductId) return;
          setDeleteModal(false);
          setSelectedProduct(null);
        }}
        title="Excluir Produto"
      >
        <div className="mt-2">
          <p className="text-sm text-slate-600">
            Tem certeza que deseja excluir o produto <strong>{selectedProduct?.nome}</strong>? Esta
            ação não pode ser desfeita.
          </p>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="inline-flex justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none disabled:opacity-50"
            onClick={() => {
              setDeleteModal(false);
              setSelectedProduct(null);
            }}
            disabled={deletingProductId !== null}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg border border-transparent bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none disabled:opacity-50"
            onClick={handleDelete}
            disabled={deletingProductId !== null}
          >
            {deletingProductId ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              'Excluir'
            )}
          </button>
        </div>
      </Modal>
    </div>
  );
}
