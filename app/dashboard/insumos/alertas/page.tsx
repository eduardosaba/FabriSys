'use client';
import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  Check,
  FileText,
  Loader2,
  AlertTriangle,
  ShoppingCart,
  Calendar,
  Clock,
  Ban,
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';

// --- IMPORTS RELATIVOS ---
import { supabase } from '@/lib/supabase';
import { Button, Modal } from '@/components/ui/shared';
import PageHeader from '@/components/ui/PageHeader';

interface InsumoAlerta {
  id: number;
  nome: string;
  unidade_estoque: string;
  estoque_atual: number;
  estoque_minimo_alerta: number;
  custo_por_ue: number;
  categoria?: { nome: string };
}

interface AlertaValidade {
  id: number;
  insumo_nome: string;
  lote?: string;
  validade: string;
  dias_restantes: number;
  qtd_entrada: number;
  ue: string;
  status: 'vencido' | 'critico' | 'atencao' | 'ok';
}

export default function AlertasPage() {
  const [insumos, setInsumos] = useState<InsumoAlerta[]>([]);
  const [alertasValidade, setAlertasValidade] = useState<AlertaValidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'estoque' | 'validade'>('estoque');

  useEffect(() => {
    void fetchDados();
  }, []);

  async function fetchDados() {
    try {
      setLoading(true);

      // 1. Buscar Estoque
      const { data: dataInsumos, error: errInsumos } = await supabase
        .from('insumos')
        .select(
          'id, nome, unidade_estoque, estoque_atual, estoque_minimo_alerta, custo_por_ue, categoria:categorias(nome)'
        )
        .order('estoque_atual', { ascending: true }); // Zerados aparecem primeiro

      if (errInsumos) throw errInsumos;
      if (dataInsumos) {
        const rows = dataInsumos as Array<Record<string, unknown>>;
        const normalized: InsumoAlerta[] = rows.map((d) => {
          const categoriaRaw = d['categoria'];
          const categoriaObj = Array.isArray(categoriaRaw)
            ? (categoriaRaw[0] as Record<string, unknown> | undefined)
            : (categoriaRaw as Record<string, unknown> | undefined);

          return {
            id: Number(d['id'] ?? 0),
            nome: String(d['nome'] ?? ''),
            unidade_estoque: String(d['unidade_estoque'] ?? ''),
            estoque_atual: Number(d['estoque_atual'] ?? 0),
            estoque_minimo_alerta: Number(d['estoque_minimo_alerta'] ?? 0),
            custo_por_ue: Number(d['custo_por_ue'] ?? 0),
            categoria: categoriaObj ? { nome: String(categoriaObj['nome'] ?? '') } : undefined,
          } as InsumoAlerta;
        });
        setInsumos(normalized);
      } else {
        setInsumos([]);
      }

      // 2. Buscar Validades
      // Use a tabela canônica `movimentacao_estoque` que contém `validade` e `lote`.
      // Aqui fazemos join (via PostgREST relationship) com `insumos` para obter
      // nome e unidade do insumo.
      const { data: dataValidade, error: errValidade } = await supabase
        .from('movimentacao_estoque')
        .select('id, validade, lote, quantidade, insumo:insumos(id, nome, unidade_estoque)')
        .eq('tipo_movimento', 'entrada')
        .not('validade', 'is', null)
        .order('validade', { ascending: true })
        .limit(50);

      if (errValidade) {
        console.error('Erro ao buscar validades em movimentacao_estoque:', errValidade);
        throw errValidade;
      }

      if (dataValidade) {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const rows = dataValidade as Array<Record<string, unknown>>;
        const processados: AlertaValidade[] = rows.map((item) => {
          const insumoRaw = item['insumo'];
          const insumoObj = Array.isArray(insumoRaw)
            ? (insumoRaw[0] as Record<string, unknown> | undefined)
            : (insumoRaw as Record<string, unknown> | undefined);

          const validadeStr = String(item['validade'] ?? '');
          const dataVal = new Date(validadeStr);
          dataVal.setHours(0, 0, 0, 0);
          const diffTime = dataVal.getTime() - hoje.getTime();
          const dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          let status: AlertaValidade['status'] = 'ok';
          if (dias < 0) status = 'vencido';
          else if (dias <= 7) status = 'critico';
          else if (dias <= 30) status = 'atencao';

          const insumoNome =
            insumoObj && 'nome' in insumoObj ? String(insumoObj['nome'] ?? '') : '';
          const ue =
            insumoObj && 'unidade_estoque' in insumoObj
              ? String(insumoObj['unidade_estoque'] ?? '')
              : '';

          return {
            id: Number(item['id'] ?? 0),
            insumo_nome: insumoNome,
            lote: item['lote'] == null ? undefined : String(item['lote']),
            validade: validadeStr,
            dias_restantes: dias,
            qtd_entrada: Number(item['quantidade'] ?? 0),
            ue,
            status,
          };
        });
        setAlertasValidade(processados.filter((p) => p.dias_restantes <= 60));
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }

  // --- FILTROS DE ESTOQUE ---
  const zerados = insumos.filter((i) => (i.estoque_atual || 0) === 0);
  const baixos = insumos.filter(
    (i) => (i.estoque_atual || 0) > 0 && (i.estoque_atual || 0) <= (i.estoque_minimo_alerta || 0)
  );
  const reposicaoNecessaria = [...zerados, ...baixos]; // Lista combinada para a tabela

  // Filtro de validade crítica (vencido ou < 7 dias)
  const validadeCritica = alertasValidade.filter(
    (a) => a.status === 'vencido' || a.status === 'critico'
  );

  return (
    <div className="space-y-6 animate-fade-up">
      <Toaster position="top-right" />

      <PageHeader
        title="Monitor de Riscos"
        description="Gestão de ruptura de estoque e perdas por validade."
        icon={AlertTriangle}
      >
        <div className="flex gap-2">
          <Button
            variant="primary"
            onClick={() => setModalOpen(true)}
            disabled={reposicaoNecessaria.length === 0}
            icon={ShoppingCart}
          >
            Gerar Pedido ({reposicaoNecessaria.length})
          </Button>
        </div>
      </PageHeader>

      {/* CARDS DE STATUS (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Card 1: Estoque Zerado (Crítico) */}
        <div
          className={`p-4 rounded-xl border shadow-sm flex items-center justify-between ${zerados.length > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}
        >
          <div>
            <p
              className={`text-xs font-bold uppercase ${zerados.length > 0 ? 'text-red-800' : 'text-slate-500'}`}
            >
              Estoque Zerado
            </p>
            <p
              className={`text-2xl font-bold ${zerados.length > 0 ? 'text-red-600' : 'text-slate-700'}`}
            >
              {zerados.length}
            </p>
          </div>
          <div
            className={`p-3 rounded-full ${zerados.length > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'}`}
          >
            <Ban size={24} />
          </div>
        </div>

        {/* Card 2: Estoque Baixo (Alerta) */}
        <div
          className={`p-4 rounded-xl border shadow-sm flex items-center justify-between ${baixos.length > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-slate-200'}`}
        >
          <div>
            <p
              className={`text-xs font-bold uppercase ${baixos.length > 0 ? 'text-yellow-800' : 'text-slate-500'}`}
            >
              Estoque Baixo
            </p>
            <p
              className={`text-2xl font-bold ${baixos.length > 0 ? 'text-yellow-600' : 'text-slate-700'}`}
            >
              {baixos.length}
            </p>
          </div>
          <div
            className={`p-3 rounded-full ${baixos.length > 0 ? 'bg-yellow-100 text-yellow-600' : 'bg-slate-100 text-slate-400'}`}
          >
            <AlertTriangle size={24} />
          </div>
        </div>

        {/* Card 3: Validade Crítica (Urgência) */}
        <div
          className={`p-4 rounded-xl border shadow-sm flex items-center justify-between ${validadeCritica.length > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'}`}
        >
          <div>
            <p
              className={`text-xs font-bold uppercase ${validadeCritica.length > 0 ? 'text-orange-800' : 'text-slate-500'}`}
            >
              Vence em 7 dias
            </p>
            <p
              className={`text-2xl font-bold ${validadeCritica.length > 0 ? 'text-orange-600' : 'text-slate-700'}`}
            >
              {validadeCritica.length}
            </p>
          </div>
          <div
            className={`p-3 rounded-full ${validadeCritica.length > 0 ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'}`}
          >
            <Clock size={24} />
          </div>
        </div>
      </div>

      {/* ABAS DE NAVEGAÇÃO */}
      <div className="flex border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('estoque')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'estoque' ? 'border-red-500 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <AlertOctagon size={18} /> Reposição
          {reposicaoNecessaria.length > 0 && (
            <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-bold">
              {reposicaoNecessaria.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('validade')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'validade' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Calendar size={18} /> Controle de Validade
          {alertasValidade.length > 0 && (
            <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-bold">
              {alertasValidade.length}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center text-slate-400">
          <Loader2 className="animate-spin mr-2" /> Analisando dados...
        </div>
      ) : activeTab === 'estoque' ? (
        /* --- ABA: REPOSIÇÃO (ZERADOS + BAIXOS) --- */
        reposicaoNecessaria.length > 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fade-up">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs border-b">
                  <tr>
                    <th className="px-6 py-3">Situação</th>
                    <th className="px-6 py-3">Produto</th>
                    <th className="px-6 py-3 text-center">Nível Atual</th>
                    <th className="px-6 py-3 text-center">Mínimo</th>
                    <th className="px-6 py-3 text-right bg-blue-50/50 text-blue-800">Sugestão</th>
                    <th className="px-6 py-3 text-right">Custo Est.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reposicaoNecessaria.map((item) => {
                    const isZero = (item.estoque_atual || 0) === 0;
                    const alvoReposicao = Math.ceil(item.estoque_minimo_alerta * 1.5);
                    const qtdSugerida = alvoReposicao - item.estoque_atual;
                    const custoEstimado = qtdSugerida * item.custo_por_ue;

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${isZero ? 'bg-red-50/30 hover:bg-red-50/60' : 'hover:bg-yellow-50/30'}`}
                      >
                        <td className="px-6 py-4">
                          {isZero ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-bold border border-red-200">
                              <Ban size={12} /> ZERADO
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs font-bold border border-yellow-200">
                              <AlertTriangle size={12} /> BAIXO
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-800">{item.nome}</p>
                          {item.categoria && (
                            <span className="text-xs text-slate-400">{item.categoria.nome}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`font-bold text-lg ${isZero ? 'text-red-600' : 'text-yellow-600'}`}
                          >
                            {item.estoque_atual}
                          </span>
                          <span className="text-xs text-slate-400 ml-1">
                            {item.unidade_estoque}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-slate-500">
                          {item.estoque_minimo_alerta}
                        </td>
                        <td className="px-6 py-4 text-right bg-blue-50/30 font-bold text-blue-600">
                          +{qtdSugerida} {item.unidade_estoque}
                        </td>
                        <td className="px-6 py-4 text-right text-slate-600 font-mono">
                          R$ {custoEstimado.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 text-center animate-fade-up">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
              <Check size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Estoque Completo!</h3>
            <p className="text-slate-500 text-sm mt-1">Não há itens zerados ou abaixo do mínimo.</p>
          </div>
        )
      ) : /* --- ABA: VALIDADE --- */
      alertasValidade.length > 0 ? (
        <div className="bg-white rounded-xl border border-orange-100 shadow-sm overflow-hidden animate-fade-up">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-orange-50 text-orange-800 uppercase text-xs border-b border-orange-100">
                <tr>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Produto / Lote</th>
                  <th className="px-6 py-3">Vencimento</th>
                  <th className="px-6 py-3 text-center">Dias Restantes</th>
                  <th className="px-6 py-3 text-right">Ação Recomendada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alertasValidade.map((item) => {
                  const statusColor =
                    item.status === 'vencido'
                      ? 'text-red-600 bg-red-50 border-red-100'
                      : item.status === 'critico'
                        ? 'text-orange-600 bg-orange-50 border-orange-100'
                        : 'text-yellow-600 bg-yellow-50 border-yellow-100';

                  const statusLabel =
                    item.status === 'vencido'
                      ? 'VENCIDO'
                      : item.dias_restantes === 0
                        ? 'VENCE HOJE'
                        : 'A VENCER';

                  return (
                    <tr key={item.id} className="hover:bg-orange-50/10 transition-colors">
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded text-[10px] font-bold border ${statusColor}`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800 text-base">{item.insumo_nome}</p>
                        {item.lote && <p className="text-xs text-slate-400">Lote: {item.lote}</p>}
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-medium">
                        {new Date(item.validade).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`font-bold ${item.status === 'vencido' ? 'text-red-600' : 'text-slate-600'}`}
                        >
                          {item.dias_restantes} dias
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {item.status === 'vencido' ? (
                          <button className="text-red-600 hover:text-red-800 text-xs font-bold border border-red-200 bg-white px-3 py-1 rounded hover:bg-red-50">
                            Registrar Perda
                          </button>
                        ) : (
                          <button className="text-blue-600 hover:text-blue-800 text-xs font-bold border border-blue-200 bg-white px-3 py-1 rounded hover:bg-blue-50">
                            Priorizar Uso
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 text-center animate-fade-up">
          <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
            <Calendar size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Validades em dia!</h3>
          <p className="text-slate-500 text-sm mt-1">
            Nenhum produto vencido ou próximo do vencimento (60 dias).
          </p>
        </div>
      )}

      {/* Modal de Pedido de Compra */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        title="Gerar Pedido Automático"
        size="lg"
      >
        <div className="p-4">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <h4 className="font-bold text-blue-800 flex items-center gap-2 mb-2">
              <FileText size={18} /> Resumo da Necessidade
            </h4>
            <p className="text-sm text-blue-700 mb-3">
              Itens zerados têm prioridade máxima na lista.
            </p>
            <div className="max-h-64 overflow-y-auto bg-white p-3 rounded border border-blue-100">
              <ul className="text-sm text-slate-600 space-y-1">
                {reposicaoNecessaria.map((c) => {
                  const isZero = (c.estoque_atual || 0) === 0;
                  return (
                    <li
                      key={c.id}
                      className="flex justify-between border-b border-slate-50 last:border-0 py-2 items-center"
                    >
                      <div className="flex items-center gap-2">
                        {isZero && <Ban size={12} className="text-red-500" />}
                        <span className={isZero ? 'font-bold text-slate-800' : ''}>{c.nome}</span>
                      </div>
                      <span className="font-bold text-blue-600">
                        +{Math.ceil(c.estoque_minimo_alerta * 1.5) - c.estoque_atual}{' '}
                        {c.unidade_estoque}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                toast.success('Pedido Gerado!');
                setModalOpen(false);
              }}
            >
              Confirmar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
