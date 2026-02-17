'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/dashboard/Card'; // Importando seu novo Card
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  ShoppingBag, 
  CreditCard,
  MoreHorizontal
} from 'lucide-react';

// Utilitário de formatação
const formatMoney = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

interface FinancialData {
  faturamento: number;
  faturamentoAnterior: number;
  qtdVendas: number;
  qtdVendasAnterior: number;
  ticketMedio: number;
  ticketMedioAnterior: number;
}

export default function AdminFinancialWidget() {
  const { profile } = useAuth();
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFinancials() {
      if (!profile?.organization_id) return;

      try {
        const now = new Date();
        
        // Datas Mês Atual
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

        // Datas Mês Anterior
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

        // 1. Buscar Vendas Mês Atual
        const { data: vendasAtual, error: errAtual } = await supabase
          .from('vendas')
          .select('total_venda')
          .eq('organization_id', profile.organization_id)
          .eq('status', 'concluida')
          .gte('created_at', startOfMonth)
          .lte('created_at', endOfMonth);

        if (errAtual) throw errAtual;

        // 2. Buscar Vendas Mês Anterior
        const { data: vendasAnterior, error: errAnterior } = await supabase
          .from('vendas')
          .select('total_venda')
          .eq('organization_id', profile.organization_id)
          .eq('status', 'concluida')
          .gte('created_at', startOfLastMonth)
          .lte('created_at', endOfLastMonth);

        if (errAnterior) throw errAnterior;

        // Cálculos
        const totalAtual = vendasAtual?.reduce((acc, curr) => acc + (curr.total_venda || 0), 0) || 0;
        const countAtual = vendasAtual?.length || 0;
        const ticketAtual = countAtual > 0 ? totalAtual / countAtual : 0;

        const totalAnterior = vendasAnterior?.reduce((acc, curr) => acc + (curr.total_venda || 0), 0) || 0;
        const countAnterior = vendasAnterior?.length || 0;
        const ticketAnterior = countAnterior > 0 ? totalAnterior / countAnterior : 0;

        setData({
          faturamento: totalAtual,
          faturamentoAnterior: totalAnterior,
          qtdVendas: countAtual,
          qtdVendasAnterior: countAnterior,
          ticketMedio: ticketAtual,
          ticketMedioAnterior: ticketAnterior
        });

      } catch (error) {
        console.error('Erro financeiro:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchFinancials();
  }, [profile]);

  const getGrowth = (atual: number, anterior: number) => {
    if (anterior === 0) return atual > 0 ? 100 : 0;
    return ((atual - anterior) / anterior) * 100;
  };

  // Se estiver carregando ou sem dados, renderiza Cards com skeleton (loading=true)
  if (loading || !data) {
    return (
      <>
        <Card title="Faturamento" loading={true} size="1x1">{null}</Card>
        <Card title="Vendas" loading={true} size="1x1">{null}</Card>
        <Card title="Ticket Médio" loading={true} size="1x1">{null}</Card>
      </>
    );
  }

  const growthFat = getGrowth(data.faturamento, data.faturamentoAnterior);
  const growthQtd = getGrowth(data.qtdVendas, data.qtdVendasAnterior);
  const growthTicket = getGrowth(data.ticketMedio, data.ticketMedioAnterior);

  return (
    <>
      {/* CARD 1: Faturamento */}
      <Card title="Faturamento" size="1x1" theme="default">
        <div className="flex flex-col h-full justify-between">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <DollarSign size={24} />
            </div>
            <GrowthBadge value={growthFat} />
          </div>
          <div>
            <span className="text-2xl font-bold text-slate-800 tracking-tight">
              {formatMoney(data.faturamento)}
            </span>
            <p className="text-xs text-slate-400 mt-1">Ref. mês atual</p>
          </div>
        </div>
      </Card>

      {/* CARD 2: Quantidade */}
      <Card title="Vendas Realizadas" size="1x1" theme="default">
        <div className="flex flex-col h-full justify-between">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <ShoppingBag size={24} />
            </div>
            <GrowthBadge value={growthQtd} />
          </div>
          <div>
            <span className="text-2xl font-bold text-slate-800 tracking-tight">
              {data.qtdVendas}
            </span>
            <p className="text-xs text-slate-400 mt-1">Pedidos concluídos</p>
          </div>
        </div>
      </Card>

      {/* CARD 3: Ticket Médio */}
      <Card title="Ticket Médio" size="1x1" theme="default">
        <div className="flex flex-col h-full justify-between">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
              <CreditCard size={24} />
            </div>
            <GrowthBadge value={growthTicket} />
          </div>
          <div>
            <span className="text-2xl font-bold text-slate-800 tracking-tight">
              {formatMoney(data.ticketMedio)}
            </span>
            <p className="text-xs text-slate-400 mt-1">Média por pedido</p>
          </div>
        </div>
      </Card>
    </>
  );
}

// Pequeno componente interno para a badge de %
function GrowthBadge({ value }: { value: number }) {
  const isPos = value >= 0;
  return (
    <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${isPos ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {isPos ? <TrendingUp size={12} className="mr-1"/> : <TrendingDown size={12} className="mr-1"/>}
      {Math.abs(value).toFixed(1)}%
    </div>
  );
}