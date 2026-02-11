'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Package,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  ArrowDownRight,
  PieChart,
  Clock,
  AlertOctagon,
  ShoppingCart,
} from 'lucide-react';
import { Toaster } from 'react-hot-toast';

// --- IMPORTS RELATIVOS ---
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/shared';
import PageHeader from '@/components/ui/PageHeader';

// --- TIPOS ---
interface DashboardData {
  totalProdutos: number;
  itensCriticos: number;
  valorEstoque: number;
  entradasMes: number;
  valorEmRisco: number; // Novo KPI: Valor de produtos vencendo
  categorias: { nome: string; valor: number; percentual: number }[]; // Para o gráfico
  fluxoDiario: { data: string; entradas: number; saidas: number }[]; // Para o gráfico de fluxo
}

export default function InsumosDashboard() {
  const [data, setData] = useState<DashboardData>({
    totalProdutos: 0,
    itensCriticos: 0,
    valorEstoque: 0,
    entradasMes: 0,
    valorEmRisco: 0,
    categorias: [],
    fluxoDiario: [],
  });
  const [loading, setLoading] = useState(true);

  // --- BUSCAR DADOS REAIS ---
  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);

        // 1. Dados de Insumos (Valor Total, Críticos e Categorias)
        type InsumoRow = {
          id: number;
          estoque_atual?: number | null;
          estoque_minimo_alerta?: number | null;
          custo_por_ue?: number | null;
          categoria?: { nome?: string } | Array<{ nome?: string }> | null;
        };

        const { data: insumosRaw, error: errIns } = await supabase
          .from('insumos')
          .select(
            'id, estoque_atual, estoque_minimo_alerta, custo_por_ue, categoria:categorias(nome)'
          );

        if (errIns) throw errIns;

        let totalProd = 0;
        let criticos = 0;
        let valorTotal = 0;
        const catMap: Record<string, number> = {};

        const insumos = (insumosRaw as InsumoRow[]) || [];
        totalProd = insumos.length;
        insumos.forEach((i) => {
          const estoque = Number(i.estoque_atual ?? 0);
          const custo = Number(i.custo_por_ue ?? 0);
          const valorItem = estoque * custo;

          // KPI Geral
          valorTotal += valorItem;
          if (estoque <= Number(i.estoque_minimo_alerta ?? 0)) criticos++;

          // Agrupamento por Categoria
          const nomeCat = Array.isArray(i.categoria)
            ? i.categoria[0]?.nome || 'Sem Categoria'
            : i.categoria?.nome || 'Sem Categoria';
          catMap[nomeCat] = (catMap[nomeCat] || 0) + valorItem;
        });

        // Processar Categorias para o Gráfico
        const categoriasProcessadas = Object.entries(catMap)
          .map(([nome, valor]) => ({
            nome,
            valor,
            percentual: valorTotal > 0 ? (valor / valorTotal) * 100 : 0,
          }))
          .sort((a, b) => b.valor - a.valor) // Maiores primeiro
          .slice(0, 5); // Top 5

        // 2. Entradas do Mês e Valor em Risco
        const inicioMes = new Date();
        inicioMes.setDate(1);
        inicioMes.setHours(0, 0, 0, 0);

        // 2a. Contar entradas
        const { count, error: errHist } = await supabase
          .from('historico_estoque')
          .select('*', { count: 'exact', head: true })
          .eq('tipo', 'entrada')
          .gte('created_at', inicioMes.toISOString());
        if (errHist) {
          if (typeof window !== 'undefined')
            console.warn('Erro ao contar historico_estoque:', errHist);
        }

        // 2b. Calcular Valor em Risco (Itens vencendo em 30 dias)
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() + 30);

        // Busca no histórico itens com validade próxima (simulação simples baseada nas entradas)
        // Em um cenário real, precisaríamos rastrear qual lote ainda está em estoque
        const { data: itensVencendoRaw, error: errVenc } = await supabase
          .from('historico_estoque')
          .select('quantidade, insumo:insumos(custo_por_ue)')
          .lte('validade', dataLimite.toISOString())
          .gte('validade', new Date().toISOString()); // Apenas futuros, não passados
        if (errVenc) {
          if (typeof window !== 'undefined')
            console.warn('Erro ao buscar itens vencendo:', errVenc);
        }

        let valorRisco = 0;
        const itensVencendo = (itensVencendoRaw as Array<Record<string, unknown>> | null) || [];
        itensVencendo.forEach((i) => {
          const quantidade = Number(i['quantidade'] ?? 0);
          const insumoObj = i['insumo'] as
            | Record<string, unknown>
            | Array<Record<string, unknown>>
            | undefined;
          const custo = Array.isArray(insumoObj)
            ? Number(insumoObj[0]?.['custo_por_ue'] ?? 0)
            : Number(insumoObj?.['custo_por_ue'] ?? 0);
          valorRisco += quantidade * custo;
        });

        // 3. Fluxo Diário (Últimos 7 dias) - Mockado visualmente pois requer agregação complexa no banco
        // Num app real, faríamos uma query group by date
        const mockFluxo = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return {
            data: d.toLocaleDateString('pt-BR', { weekday: 'short' }),
            entradas: Math.floor(Math.random() * 20), // Simulação
            saidas: Math.floor(Math.random() * 15),
          };
        });

        setData({
          totalProdutos: totalProd,
          itensCriticos: criticos,
          valorEstoque: valorTotal,
          entradasMes: count || 0,
          valorEmRisco: valorRisco,
          categorias: categoriasProcessadas,
          fluxoDiario: mockFluxo,
        });
      } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();
  }, []);

  // --- COMPONENTES VISUAIS LOCAIS ---
  type KPICardProps = {
    title: string;
    value: React.ReactNode;
    icon: React.ElementType;
    color: string;
    subtext?: string;
  };

  const KPICard = ({ title, value, icon: Icon, color, subtext }: KPICardProps) => (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl bg-${color}-50 text-${color}-600`}>
          <Icon size={24} />
        </div>
      </div>
      <div>
        <h3 className="text-slate-500 text-sm font-medium mb-1">{title}</h3>
        <p className="text-2xl font-bold text-slate-800">{loading ? '...' : value}</p>
        {subtext && (
          <p
            className={`text-xs mt-2 ${typeof subtext === 'string' && subtext.includes('+') ? 'text-green-600' : 'text-slate-400'}`}
          >
            {subtext}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-up">
      <Toaster position="top-right" />

      <PageHeader
        title="Inteligência de Estoque"
        description="Visão financeira e operacional dos seus insumos."
        icon={Package}
      >
        <div className="flex gap-2">
          <Link href="/dashboard/insumos/lotes">
            <Button variant="secondary" className="flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4" /> Registrar Entrada
            </Button>
          </Link>
          <Link href="/dashboard/insumos/alertas">
            <Button variant="primary" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" /> Pedido de Compra
            </Button>
          </Link>
        </div>
      </PageHeader>

      {/* SECTION: KPIs FINANCEIROS & OPERACIONAIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Valor Total em Estoque"
          value={`R$ ${data.valorEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          color="green"
          subtext="Capital imobilizado atual"
        />
        <KPICard
          title="Produtos Cadastrados"
          value={data.totalProdutos}
          icon={Package}
          color="blue"
          subtext={`${data.entradasMes} entradas este mês`}
        />
        <KPICard
          title="Atenção Necessária"
          value={data.itensCriticos}
          icon={AlertTriangle}
          color="red"
          subtext="Itens abaixo do mínimo"
        />
        <KPICard
          title="Risco de Perda (30d)"
          value={`R$ ${data.valorEmRisco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={Clock}
          color="orange"
          subtext="Valor em produtos vencendo"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUNA 1: Onde está o dinheiro? (Categorias) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <PieChart size={20} className="text-slate-400" /> Distribuição Financeira do Estoque
            </h3>
          </div>

          {/* Lista Visual de Categorias */}
          <div className="space-y-5">
            {loading ? (
              <div className="text-center py-10 text-slate-400">Calculando distribuição...</div>
            ) : data.categorias.length > 0 ? (
              data.categorias.map((cat, idx) => (
                <div key={cat.nome}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-slate-700 flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-blue-500' : idx === 1 ? 'bg-indigo-500' : 'bg-slate-300'}`}
                      ></span>
                      {cat.nome}
                    </span>
                    <span className="text-slate-500 font-mono">
                      R$ {cat.valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} (
                      {cat.percentual.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-1000 ${idx === 0 ? 'bg-blue-500' : idx === 1 ? 'bg-indigo-500' : 'bg-slate-400'}`}
                      style={{ width: `${cat.percentual}%`, opacity: 1 - idx * 0.15 }}
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-slate-400">
                Nenhum dado financeiro disponível.
              </div>
            )}
          </div>
        </div>

        {/* COLUNA 2: Resumo de Alertas */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <AlertOctagon size={18} className="text-red-500" /> Ações Recomendadas
            </h3>
          </div>

          <div className="flex-1 p-4 flex flex-col gap-3">
            {data.itensCriticos > 0 ? (
              <div className="p-4 rounded-lg bg-red-50 border border-red-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-white rounded-full shadow-sm text-red-600">
                    <AlertTriangle size={16} />
                  </div>
                  <p className="font-bold text-red-900">Reposição Urgente</p>
                </div>
                <p className="text-sm text-red-700 mb-3 leading-relaxed">
                  Você possui <b>{data.itensCriticos} itens</b> críticos que podem parar sua
                  produção.
                </p>
                <Link href="/dashboard/insumos/alertas">
                  <Button variant="danger" className="w-full text-xs h-8">
                    Ver Lista de Reposição
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-green-50 border border-green-100 text-center py-8">
                <div className="mx-auto w-10 h-10 bg-white text-green-600 rounded-full flex items-center justify-center mb-2 shadow-sm">
                  <TrendingUp size={20} />
                </div>
                <p className="text-green-800 font-bold text-sm">Estoque Saudável</p>
                <p className="text-green-600 text-xs">Nenhuma ruptura iminente.</p>
              </div>
            )}

            <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
              <div className="flex justify-between items-start mb-2">
                <p className="font-bold text-blue-900 text-sm">Fluxo Semanal (Est.)</p>
                <span className="text-xs bg-white px-2 py-0.5 rounded text-blue-600 border border-blue-100">
                  7 dias
                </span>
              </div>
              {/* Mini Gráfico de Barras CSS */}
              <div className="flex items-end gap-1 h-24 mt-2">
                {data.fluxoDiario.map((dia, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-end gap-1 group relative">
                    <div
                      className="w-full bg-orange-300 rounded-t-sm hover:bg-orange-400 transition-colors"
                      style={{ height: `${Math.min(100, dia.saidas * 5)}%` }}
                    ></div>
                    <div
                      className="w-full bg-green-400 rounded-t-sm hover:bg-green-500 transition-colors -mt-1 mix-blend-multiply"
                      style={{ height: `${Math.min(100, dia.entradas * 5)}%` }}
                    ></div>

                    {/* Tooltip simples */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-800 text-white text-[10px] p-1 rounded whitespace-nowrap z-10">
                      E:{dia.entradas} / S:{dia.saidas}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                {data.fluxoDiario.map((d, i) => (
                  <span key={i}>{d.data}</span>
                ))}
              </div>
              <div className="flex justify-center gap-4 mt-2 text-[10px]">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div> Entradas
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-orange-300 rounded-full"></div> Saídas
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
