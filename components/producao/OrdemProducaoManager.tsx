'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Play,
  Pause,
  CheckCircle,
  Calculator,
  Package,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import Button from '@/components/Button';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabase';
import { OrdemProducao, InsumoTeorico, InsumoReal, StatusOP } from '@/lib/types/producao';
import { useAuth } from '@/lib/auth';

interface OrdemProducaoManagerProps {
  ordem: OrdemProducao;
  onUpdate: () => void;
}

type FaseOP = 'criacao' | 'execucao' | 'finalizacao';

export default function OrdemProducaoManager({ ordem, onUpdate }: OrdemProducaoManagerProps) {
  const _router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [faseAtual, setFaseAtual] = useState<FaseOP>('criacao');
  const [quantidadeReal, _setQuantidadeReal] = useState<number>(ordem.quantidade_prevista);
  const [observacoesProducao, _setObservacoesProducao] = useState<string>('');

  // Determinar fase atual baseada no status
  useEffect(() => {
    switch (ordem.status) {
      case StatusOP.PENDENTE:
        setFaseAtual('criacao');
        break;
      case StatusOP.EM_PRODUCAO:
        setFaseAtual('execucao');
        break;
      case StatusOP.FINALIZADA:
        setFaseAtual('finalizacao');
        break;
      default:
        setFaseAtual('criacao');
    }
  }, [ordem.status]);

  // Calcular insumos teóricos baseado na ficha técnica
  const calcularInsumosTeoricos = async (): Promise<InsumoTeorico[]> => {
    const { data: fichaTecnica, error } = await supabase
      .from('ficha_tecnica')
      .select(
        `
        quantidade,
        unidade_medida,
        insumo:insumos (
          id,
          nome,
          unidade_estoque,
          custo_por_ue,
          unidade_consumo,
          fator_conversao
        )
      `
      )
      .eq('produto_final_id', ordem.produto_final_id);

    if (error instanceof Error || !fichaTecnica) return [];

    const insumosTeoricos: InsumoTeorico[] = fichaTecnica.map((item) => {
      const insumo = Array.isArray(item.insumo) ? item.insumo[0] : item.insumo;
      const quantidadeUC = item.quantidade * ordem.quantidade_prevista;
      const quantidadeUE = insumo?.fator_conversao
        ? quantidadeUC / insumo.fator_conversao
        : quantidadeUC;
      const custoTotal =
        insumo?.custo_por_ue && insumo?.fator_conversao
          ? (insumo.custo_por_ue / insumo.fator_conversao) * quantidadeUC
          : 0;

      return {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        insumo_id: insumo?.id || '',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        nome_insumo: insumo?.nome || '',
        quantidade_uc: quantidadeUC,
        unidade_consumo: item.unidade_medida,
        quantidade_ue: quantidadeUE,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        unidade_estoque: insumo?.unidade_estoque || '',
        custo_total: custoTotal,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        fator_conversao: insumo?.fator_conversao || 1,
      };
    });

    return insumosTeoricos;
  };

  // Iniciar produção (Fase 1 → Fase 2)
  const iniciarProducao = async () => {
    try {
      setLoading(true);

      // Calcular insumos teóricos
      const insumosTeoricos = await calcularInsumosTeoricos();
      const custoTotalTeorico = insumosTeoricos.reduce((acc, item) => acc + item.custo_total, 0);

      const { error } = await supabase
        .from('ordens_producao')
        .update({
          status: StatusOP.EM_PRODUCAO,
          data_inicio: new Date().toISOString(),
          insumos_teoricos: insumosTeoricos,
          custo_previsto: custoTotalTeorico,
        })
        .eq('id', ordem.id);

      if (error) throw error;

      toast({
        title: 'Produção iniciada',
        description: 'A ordem de produção foi movida para execução.',
        variant: 'success',
      });

      onUpdate();
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar a produção.',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Finalizar produção (Fase 2 → Fase 3)
  const finalizarProducao = async () => {
    try {
      setLoading(true);

      // Usar os insumos teóricos calculados como consumo real
      const insumosReais: InsumoReal[] = (ordem.insumos_teoricos || []).map(
        (item: InsumoTeorico) => ({
          insumo_id: item.insumo_id,
          quantidade_ue_consumida: item.quantidade_ue,
          unidade_estoque: item.unidade_estoque,
        })
      );

      // Calcular custo real
      const custoTotalReal = (ordem.insumos_teoricos || []).reduce(
        (acc: number, item: InsumoTeorico) => acc + item.custo_total,
        0
      );
      const custoRealUnitario = quantidadeReal > 0 ? custoTotalReal / quantidadeReal : 0;

      // Calcular percentual de perda/ganho
      const percentualPerdaGanho =
        ((quantidadeReal - ordem.quantidade_prevista) / ordem.quantidade_prevista) * 100;

      // Baixar insumos do estoque
      for (const insumoReal of insumosReais) {
        // Aqui seria implementada a baixa real do estoque
        // Por enquanto, apenas registra o consumo
        console.log(
          `Baixando ${insumoReal.quantidade_ue_consumida} ${insumoReal.unidade_estoque} do insumo ${insumoReal.insumo_id}`
        );
      }

      const { error } = await supabase
        .from('ordens_producao')
        .update({
          status: StatusOP.FINALIZADA,
          data_fim: new Date().toISOString(),
          quantidade_real_produzida: quantidadeReal,
          custo_real_unitario: custoRealUnitario,
          custo_total_real: custoTotalReal,
          percentual_perda_ganho: percentualPerdaGanho,
          insumos_reais: insumosReais,
          observacoes_producao: observacoesProducao,
          finalizado_por: user?.id,
          supervisor_producao: user?.id,
        })
        .eq('id', ordem.id);

      if (error) throw error;

      toast({
        title: 'Produção finalizada',
        description: `Produzidos ${quantidadeReal} itens. ${percentualPerdaGanho >= 0 ? 'Ganho' : 'Perda'} de ${Math.abs(percentualPerdaGanho).toFixed(1)}%.`,
        variant: 'success',
      });

      onUpdate();
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível finalizar a produção.',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case StatusOP.PENDENTE:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case StatusOP.EM_PRODUCAO:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case StatusOP.FINALIZADA:
        return 'bg-green-100 text-green-800 border-green-200';
      case StatusOP.PAUSADA:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case StatusOP.CANCELADA:
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case StatusOP.PENDENTE:
        return <Calculator size={16} />;
      case StatusOP.EM_PRODUCAO:
        return <Play size={16} />;
      case StatusOP.FINALIZADA:
        return <CheckCircle size={16} />;
      case StatusOP.PAUSADA:
        return <Pause size={16} />;
      default:
        return <AlertTriangle size={16} />;
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-xl dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Ordem de Produção {ordem.numero_op}
          </h2>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium ${getStatusColor(ordem.status)}`}
            >
              {getStatusIcon(ordem.status)}
              {ordem.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Fase 1: Criação */}
      {faseAtual === 'criacao' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-900/20">
            <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-blue-800 dark:text-blue-200">
              <Calculator size={20} />
              Fase 1: Criação da Ordem de Produção
            </h3>
            <div className="space-y-3 text-sm text-blue-700 dark:text-blue-300">
              <p>
                • Quantidade prevista: <strong>{ordem.quantidade_prevista}</strong> unidades
              </p>
              <p>
                • Custo previsto: <strong>R$ {ordem.custo_previsto?.toFixed(2) || '0.00'}</strong>
              </p>
              <p>• Status: Aguardando início da produção</p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={iniciarProducao}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Play size={18} />
              {loading ? 'Iniciando...' : 'Iniciar Produção'}
            </Button>
          </div>
        </div>
      )}

      {/* Fase 2: Execução */}
      {faseAtual === 'execucao' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-green-200 bg-green-50 p-6 dark:border-green-800 dark:bg-green-900/20">
            <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-green-800 dark:text-green-200">
              <Package size={20} />
              Fase 2: Execução da Produção
            </h3>
            <div className="space-y-3 text-sm text-green-700 dark:text-green-300">
              <p>
                • Iniciada em:{' '}
                <strong>{new Date(ordem.data_inicio!).toLocaleString('pt-BR')}</strong>
              </p>
              <p>• Insumos teóricos calculados e reservados</p>
              <p>• Status: Produção em andamento</p>
            </div>
          </div>

          {/* Lista de insumos teóricos */}
          {ordem.insumos_teoricos && ordem.insumos_teoricos.length > 0 && (
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
              <h4 className="mb-3 font-semibold text-gray-800 dark:text-gray-200">
                Insumos Necessários (Teóricos)
              </h4>
              <div className="space-y-2">
                {ordem.insumos_teoricos.map((insumo: InsumoTeorico, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded border bg-white p-2 dark:bg-gray-800"
                  >
                    <div>
                      <span className="font-medium">{insumo.nome_insumo}</span>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {insumo.quantidade_uc.toFixed(3)} {insumo.unidade_consumo} →
                        {insumo.quantidade_ue.toFixed(3)} {insumo.unidade_estoque}
                      </div>
                    </div>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      R$ {insumo.custo_total.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={finalizarProducao}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <CheckCircle size={18} />
              {loading ? 'Finalizando...' : 'Finalizar Produção'}
            </Button>
          </div>
        </div>
      )}

      {/* Fase 3: Finalização */}
      {faseAtual === 'finalizacao' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-purple-200 bg-purple-50 p-6 dark:border-purple-800 dark:bg-purple-900/20">
            <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-purple-800 dark:text-purple-200">
              <TrendingUp size={20} />
              Fase 3: Produção Finalizada
            </h3>
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div>
                <p className="text-purple-700 dark:text-purple-300">
                  Quantidade Real: <strong>{ordem.quantidade_real_produzida}</strong>
                </p>
                <p className="text-purple-700 dark:text-purple-300">
                  Custo Unitário Real: <strong>R$ {ordem.custo_real_unitario?.toFixed(4)}</strong>
                </p>
              </div>
              <div>
                <p className="text-purple-700 dark:text-purple-300">
                  Performance:{' '}
                  <strong
                    className={
                      ordem.percentual_perda_ganho! >= 0 ? 'text-green-600' : 'text-red-600'
                    }
                  >
                    {ordem.percentual_perda_ganho! >= 0 ? '+' : ''}
                    {ordem.percentual_perda_ganho?.toFixed(1)}%
                  </strong>
                </p>
                <p className="text-purple-700 dark:text-purple-300">
                  Finalizada em:{' '}
                  <strong>{new Date(ordem.data_fim!).toLocaleString('pt-BR')}</strong>
                </p>
              </div>
            </div>
          </div>

          {ordem.observacoes_producao && (
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
              <h4 className="mb-2 font-semibold text-gray-800 dark:text-gray-200">
                Observações da Produção
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {ordem.observacoes_producao}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
