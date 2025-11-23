'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import Loading from '@/components/ui/Loading';
import { Package, Printer, Filter } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/lib/theme'; // Importando o tema para pegar a logo

interface EstoqueItem {
  id: number;
  nome: string;
  categoria: string;
  unidade: string;
  estoque_atual: number;
  custo_medio: number;
  valor_total: number;
  status: 'ok' | 'baixo' | 'zerado';
}

export default function RelatorioEstoquePage() {
  const { theme } = useTheme(); // Hook do tema para a logo
  const [itens, setItens] = useState<EstoqueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [categorias, setCategorias] = useState<string[]>([]);

  const carregarDados = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('insumos')
        .select(
          `
          id, nome, unidade_estoque, estoque_atual, custo_por_ue, estoque_minimo_alerta,
          categoria:categorias(nome)
        `
        )
        .order('nome');

      if (error) throw error;

      const rows = (data ?? []) as unknown[];
      const formatados: EstoqueItem[] = rows.map((item) => {
        const it = item as Record<string, unknown>;
        const qtd = Number(it['estoque_atual'] ?? 0) || 0;
        const custo = Number(it['custo_por_ue'] ?? 0) || 0;
        const min = Number(it['estoque_minimo_alerta'] ?? 0) || 0;

        let status: EstoqueItem['status'] = 'ok';
        if (qtd === 0) status = 'zerado';
        else if (qtd <= min) status = 'baixo';

        return {
          id: Number(it['id'] ?? 0),
          nome: String(it['nome'] ?? ''),
          categoria: String(
            (it['categoria'] as Record<string, unknown> | undefined)?.['nome'] ?? 'Sem Categoria'
          ),
          unidade: String(it['unidade_estoque'] ?? 'UN'),
          estoque_atual: qtd,
          custo_medio: custo,
          valor_total: qtd * custo,
          status,
        };
      });

      setItens(formatados);

      const cats = Array.from(new Set(formatados.map((i) => i.categoria))).sort();
      setCategorias(cats);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao gerar relatório.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void carregarDados();
  }, []);

  const itensFiltrados =
    filtroCategoria === 'todos' ? itens : itens.filter((i) => i.categoria === filtroCategoria);

  const valorTotalEstoque = itensFiltrados.reduce((acc, curr) => acc + curr.valor_total, 0);

  if (loading) return <Loading />;

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-up">
      {/* CONTROLES DE TELA (Escondidos na impressão) */}
      <div className="print:hidden space-y-6">
        <PageHeader
          title="Relatório de Posição de Estoque"
          description="Inventário valorizado e quantitativo atual."
          icon={Package}
        >
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Printer size={18} /> Imprimir Relatório
            </button>
          </div>
        </PageHeader>

        {/* Cards de Resumo e Filtros (Tela) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
            <span className="text-sm text-slate-500 mb-1">Valor Total (Visão Atual)</span>
            <span className="text-2xl font-bold text-green-700">
              {valorTotalEstoque.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>

          <div className="md:col-span-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <Filter className="text-slate-400" />
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                Filtrar por Categoria
              </label>
              <select
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-100"
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
              >
                <option value="todos">Todas as Categorias</option>
                {categorias.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ÁREA IMPRESSA (Estilizada para papel A4) */}
      {/* A classe 'print:fixed print:inset-0' força este bloco a cobrir a tela toda ao imprimir */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden print:shadow-none print:border-0 print:fixed print:inset-0 print:z-[9999] print:bg-white print:p-8 print:h-screen print:w-screen print:overflow-visible">
        {/* Cabeçalho Exclusivo para Impressão */}
        <div className="hidden print:flex justify-between items-start mb-8 border-b-2 border-black pb-4">
          <div className="flex items-center gap-4">
            {/* Logo da Empresa */}
            <img
              src={theme?.company_logo_url ?? theme?.logo_url ?? '/logo.png'}
              alt="Logo"
              className="h-16 w-auto object-contain grayscale" // Grayscale economiza tinta colorida
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
            <div>
              <h1 className="text-3xl font-bold text-black uppercase tracking-tight">
                Posição de Estoque
              </h1>
              <p className="text-sm text-gray-600 font-medium">
                {theme?.name || 'Confectio System'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase">Data de Emissão</p>
            <p className="text-lg font-bold text-black">{new Date().toLocaleDateString('pt-BR')}</p>
            <p className="text-xs text-gray-500">{new Date().toLocaleTimeString('pt-BR')}</p>
          </div>
        </div>

        {/* Resumo no topo da impressão */}
        <div className="hidden print:block mb-6 bg-gray-50 p-4 border border-gray-200 rounded">
          <div className="flex justify-between items-center">
            <span className="font-bold text-gray-700 uppercase text-sm">
              Valor Total em Estoque:
            </span>
            <span className="font-bold text-2xl text-black">
              {valorTotalEstoque.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Categoria: {filtroCategoria === 'todos' ? 'Todas' : filtroCategoria} | Itens listados:{' '}
            {itensFiltrados.length}
          </div>
        </div>

        {/* Tabela */}
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200 uppercase text-xs print:bg-gray-100 print:text-black print:border-black">
            <tr>
              <th className="px-6 py-3 print:px-2 print:py-1">Produto</th>
              <th className="px-6 py-3 print:px-2 print:py-1">Categoria</th>
              <th className="px-6 py-3 text-right print:px-2 print:py-1">Qtd</th>
              <th className="px-6 py-3 text-right print:px-2 print:py-1">Custo Un.</th>
              <th className="px-6 py-3 text-right font-bold print:px-2 print:py-1">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 print:divide-gray-300">
            {itensFiltrados.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-slate-50 transition-colors print:break-inside-avoid"
              >
                <td className="px-6 py-3 print:px-2 print:py-1">
                  <div className="font-medium text-slate-800 print:text-black">{item.nome}</div>
                  {item.status === 'baixo' && (
                    <span className="text-[10px] text-orange-600 font-bold print:text-black print:italic">
                      {' '}
                      (Baixo)
                    </span>
                  )}
                  {item.status === 'zerado' && (
                    <span className="text-[10px] text-red-600 font-bold print:text-black print:font-bold">
                      {' '}
                      (ZERADO)
                    </span>
                  )}
                </td>
                <td className="px-6 py-3 text-slate-500 print:text-black print:px-2 print:py-1">
                  {item.categoria}
                </td>
                <td className="px-6 py-3 text-right font-mono print:text-black print:px-2 print:py-1">
                  {item.estoque_atual}{' '}
                  <span className="text-xs text-slate-400 print:text-gray-600">{item.unidade}</span>
                </td>
                <td className="px-6 py-3 text-right text-slate-600 print:text-black print:px-2 print:py-1">
                  {item.custo_medio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className="px-6 py-3 text-right font-bold text-slate-800 bg-slate-50/50 print:bg-transparent print:text-black print:px-2 print:py-1">
                  {item.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
              </tr>
            ))}
            {itensFiltrados.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  Nenhum item encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Rodapé da Impressão */}
        <div className="hidden print:block mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
          <p>
            Relatório gerado pelo sistema Confectio. Conferência física recomendada periodicamente.
          </p>
        </div>
      </div>
    </div>
  );
}
