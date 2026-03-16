'use client';

import React, { useEffect, useState, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import GraficoPerdasEstoque from '@/app/dashboard/admin/GraficoPerdasEstoque';
import Card from '@/components/ui/Card';
import {
  Factory,
  Package,
  Truck,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import AlertasDinamicos from './AlertasDinâmicos';
import ConfigMetaRapida from './ConfigMetaRapida';

export default function FabricaDashboardPage() {
  const { profile } = useAuth();
  const [kpis, setKpis] = useState({
    ops_fila: 0,
    envios_pendentes: 0,
    total_estoque_fabrica: 0,
    itens_estoque_baixo: 0,
  });

  const [progresso, setProgresso] = useState({ produzido: 0, meta: 1000, percent: 0 });

  const orgId = profile?.organization_id ?? null;

  const loadData = useCallback(async () => {
    let mounted = true;
    // note: mounted flag is used only within this invocation
    async function _do() {
      // 1) KPIs gerais
      const { data: kpiData, error: kpiErr } = await supabase
        .from('v_kpi_fabrica')
        .select('*')
        .single();
      if (kpiErr) console.debug('v_kpi_fabrica load error', kpiErr.message);
      if (kpiData && mounted) setKpis(kpiData);

      // 2) Buscar meta dinâmica da tabela de configurações
      let metaAtual = 1000;
      try {
        if (orgId) {
          const { data: configData, error: configErr } = await supabase
            .from('configuracoes_sistema')
            .select('valor')
            .match({ chave: 'meta_producao_diaria', organization_id: orgId })
            .maybeSingle();
          if (configErr) console.debug('config load error', configErr.message);
          if (configData && configData.valor) metaAtual = parseInt(configData.valor, 10) || 1000;
        }
      } catch (err) {
        console.debug('Erro ao carregar meta dinâmica', err);
      }

      // 3) Carrega Progresso Real usando a versão numeric do RPC
      try {
        const { data: progData, error: progErr } = await supabase.rpc(
          'get_progresso_producao_hoje_numeric',
          { p_meta_diaria: metaAtual }
        );
        if (progErr) console.debug('get_progresso_producao_hoje_numeric error', progErr.message);
        if (progData && progData[0] && mounted) {
          setProgresso({
            produzido: Number(progData[0].produzido_hoje) || 0,
            meta: metaAtual,
            percent: Math.min(Number(progData[0].percentagem) || 0, 100),
          });
        }
      } catch (err) {
        console.debug('RPC progresso error', err);
      }
    }
    await _do();
    return () => {
      mounted = false;
    };
  }, [orgId]);

  useEffect(() => {
    // initial load and poll
    let cancelled = false;
    loadData();
    const iv = setInterval(() => {
      if (!cancelled) loadData();
    }, 5000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [loadData]);

  useEffect(() => {
    const handler = (e: any) => {
      // when meta is updated in UI, reload immediately
      loadData();
    };
    window.addEventListener('metaUpdated', handler as EventListener);
    return () => window.removeEventListener('metaUpdated', handler as EventListener);
  }, [loadData]);

  const StatCard = ({ title, value, icon: Icon, color, description }: any) => (
    <Card className="relative overflow-hidden group">
      <div
        className={`absolute right-[-10px] top-[-10px] opacity-10 group-hover:scale-110 transition-transform`}
      >
        <Icon size={80} />
      </div>
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-2xl ${color} bg-opacity-10`}>
          <Icon className={color.replace('bg-', 'text-')} size={24} />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-black text-slate-800">{value}</h3>
          <p className="text-[10px] text-slate-400 mt-1">{description}</p>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Painel de Controle Fábrica"
        description="Monitoramento em tempo real da produção e logística central."
        icon={Factory}
      />

      {/* Grid de KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Fila de Produção"
          value={kpis.ops_fila}
          icon={Clock}
          color="bg-amber-500"
          description="Ordens aguardando início"
        />
        <StatCard
          title="Pronto p/ Envio"
          value={kpis.envios_pendentes}
          icon={Truck}
          color="bg-blue-500"
          description="Cargas aguardando despacho"
        />
        <StatCard
          title="Estoque Central"
          value={`${kpis.total_estoque_fabrica} un`}
          icon={Package}
          color="bg-emerald-500"
          description="Saldo físico na fábrica"
        />
        <StatCard
          title="Alertas de Estoque"
          value={kpis.itens_estoque_baixo}
          icon={AlertTriangle}
          color="bg-rose-500"
          description="Itens abaixo do nível de segurança"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Gráfico de Auditoria que criamos anteriormente */}
          <GraficoPerdasEstoque />

          <Card>
            <h4 className="font-bold mb-3">Eficiência da Produção</h4>
            <div className="flex items-center gap-6 p-4">
              <div className="relative h-24 w-24 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-slate-100"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * progresso.percent) / 100}
                    className="text-emerald-500 transition-all duration-1000"
                  />
                </svg>
                <span className="absolute text-lg font-black text-slate-700">
                  {progresso.percent}%
                </span>
              </div>
              <div>
                <h4 className="font-bold text-slate-700">Meta de Produção Diária</h4>
                <p className="text-sm text-slate-500">
                  Você produziu{' '}
                  <span className="font-bold text-slate-900">{progresso.produzido}</span> de{' '}
                  {progresso.meta} itens planejados para hoje.
                </p>
                {progresso.percent >= 100 && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-bold mt-2 inline-block">
                    META ATINGIDA! 🎉
                  </span>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Coluna Lateral */}
        <div className="space-y-6">
          <ConfigMetaRapida orgId={profile?.organization_id} />

          <Card>
            <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-4">
              Ações Estratégicas
            </h4>
            <div className="space-y-2">
              <Link
                href="/dashboard/producao/kanban"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-600 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Factory size={18} />
                  <span className="text-sm font-bold">Gerenciar Kanban</span>
                </div>
                <ArrowRight
                  size={16}
                  className="opacity-0 group-hover:opacity-100 transition-all"
                />
              </Link>
              <Link
                href="/dashboard/logistica/expedicao"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-600 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Truck size={18} />
                  <span className="text-sm font-bold">Painel de Expedição</span>
                </div>
                <ArrowRight
                  size={16}
                  className="opacity-0 group-hover:opacity-100 transition-all"
                />
              </Link>
            </div>
          </Card>

          <Card className="bg-slate-900 text-white border-none shadow-xl">
            <AlertasDinamicos orgId={profile?.organization_id || ''} />
          </Card>
        </div>
      </div>
    </div>
  );
}
