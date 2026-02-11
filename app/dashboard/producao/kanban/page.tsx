'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import Loading from '@/components/ui/Loading';
import {
  ChefHat,
  ArrowRight,
  Package,
  CheckCircle,
  Kanban as KanbanIcon,
  Printer,
  X,
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';

// Definição das colunas do fluxo
const COLUNAS = [
  { id: 'planejamento', label: 'A Fazer', cor: 'bg-gray-100 border-gray-300' },
  { id: 'fogao', label: 'No Fogão 🔥', cor: 'bg-orange-50 border-orange-200' },
  { id: 'descanso', label: 'Descanso ❄️', cor: 'bg-blue-50 border-blue-200' },
  { id: 'finalizacao', label: 'Finalização 🍬', cor: 'bg-purple-50 border-purple-200' },
  { id: 'expedicao', label: 'Expedição 📦', cor: 'bg-green-50 border-green-200' },
];

interface OrdemKanban {
  id: string;
  numero_op: string;
  produto_nome: string;
  quantidade_prevista: number;
  qtd_receitas: number;
  massa_total: number;
  estagio: string;
  distribuicao: { local: string; qtd: number }[];
}

export default function KanbanPage() {
  const [ordens, setOrdens] = useState<OrdemKanban[]>([]);
  const [loading, setLoading] = useState(true);
  const [movendo, setMovendo] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // Estado para controlar qual ordem está sendo expedida (abre o modal)
  const [ordemParaExpedir, setOrdemParaExpedir] = useState<OrdemKanban | null>(null);

  const carregarKanban = async () => {
    try {
      const { data, error } = await supabase
        .from('ordens_producao')
        .select(
          `
          id, numero_op, quantidade_prevista, 
          qtd_receitas_calculadas, massa_total_kg, estagio_atual,
          produto_final:produtos_finais(nome),
          distribuicao:distribuicao_pedidos(quantidade_solicitada, local:locais(nome))
        `
        )
        .neq('estagio_atual', 'concluido')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const rows = (data ?? []) as unknown[];
      const formatadas: OrdemKanban[] = rows.map((d) => {
        const obj = d as Record<string, unknown>;

        const distribuicaoRaw = (obj['distribuicao'] as unknown[]) ?? [];
        const distribuicao = distribuicaoRaw.map((dist) => {
          const di = dist as Record<string, unknown>;
          const localField = di['local'];
          const localObj = Array.isArray(localField) ? localField[0] : localField;
          return {
            local: String((localObj as Record<string, unknown> | undefined)?.['nome'] ?? ''),
            qtd: Number(di['quantidade_solicitada'] ?? 0),
          };
        });

        return {
          id: String(obj['id'] ?? ''),
          numero_op: String(obj['numero_op'] ?? ''),
          produto_nome: String(
            (Array.isArray(obj['produto_final'])
              ? obj['produto_final'][0]
              : obj['produto_final'])?.['nome'] ?? ''
          ),
          quantidade_prevista: Number(obj['quantidade_prevista'] ?? 0),
          qtd_receitas: Number(obj['qtd_receitas_calculadas'] ?? 0),
          massa_total: Number(obj['massa_total_kg'] ?? 0),
          estagio: String(obj['estagio_atual'] ?? 'planejamento'),
          distribuicao,
        };
      });

      if (mountedRef.current) setOrdens(formatadas);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar quadro.');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    void carregarKanban();
    const interval = setInterval(() => {
      void carregarKanban();
    }, 30000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  const moverOrdem = async (ordemId: string, estagioAtual: string, novoEstagioManual?: string) => {
    // Se for manual (ex: expedição -> concluído), usa ele. Senão calcula o próximo.
    let proximoEstagio = novoEstagioManual;

    if (!proximoEstagio) {
      const idxAtual = COLUNAS.findIndex((c) => c.id === estagioAtual);
      if (idxAtual === -1 || idxAtual === COLUNAS.length - 1) return;
      proximoEstagio = COLUNAS[idxAtual + 1].id;
    }

    setMovendo(ordemId);
    try {
      const rpcRes = (await supabase.rpc('movimentar_ordem', {
        p_ordem_id: ordemId,
        p_novo_estagio: proximoEstagio,
      })) as unknown as { data?: unknown; error?: unknown };

      const data = rpcRes.data;
      const error = rpcRes.error;

      if (error) throw error;

      const resp = data as Record<string, unknown> | null;
      const success = Boolean(resp?.['success']);
      const message = String(resp?.['message'] ?? '');

      if (success) {
        toast.success(message || 'Ordem movida');
        await carregarKanban();
      } else {
        toast.error(message || 'Falha ao mover ordem');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao mover ordem.');
    } finally {
      if (mountedRef.current) setMovendo(null);
    }
  };

  // --- Funções de Expedição ---
  const handleExpedir = (ordem: OrdemKanban) => {
    setOrdemParaExpedir(ordem);
  };

  const confirmarExpedicao = async () => {
    if (!ordemParaExpedir) return;
    // Mover para 'concluido' remove do quadro Kanban
    await moverOrdem(ordemParaExpedir.id, 'expedicao', 'concluido');
    setOrdemParaExpedir(null);
    toast.success('Ordem expedida e arquivada!');
  };

  if (loading) return <Loading />;

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] p-6 overflow-hidden animate-fade-up">
      <Toaster position="top-center" />

      <PageHeader
        title="Quadro de Produção (Kanban)"
        description="Acompanhamento em tempo real do chão de fábrica."
        icon={KanbanIcon}
      />

      <div className="flex-1 overflow-x-auto overflow-y-hidden mt-4">
        <div className="flex gap-4 h-full min-w-[1200px]">
          {COLUNAS.map((coluna) => {
            const ordensColuna = ordens.filter((o) => o.estagio === coluna.id);

            return (
              <div
                key={coluna.id}
                className={`flex flex-col w-80 rounded-xl border-t-4 ${coluna.cor} bg-white shadow-sm h-full`}
              >
                <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h3 className="font-bold text-gray-700">{coluna.label}</h3>
                  <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full font-bold">
                    {ordensColuna.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-3 bg-gray-50/30">
                  {ordensColuna.length === 0 && (
                    <div className="text-center text-gray-400 text-sm mt-10 italic">Vazio</div>
                  )}

                  {ordensColuna.map((ordem) => (
                    <div
                      key={ordem.id}
                      className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1 rounded">
                          #{ordem.numero_op}
                        </span>
                        <span className="text-xs font-bold text-blue-600">
                          {ordem.quantidade_prevista} un
                        </span>
                      </div>

                      <h4 className="font-bold text-gray-800 mb-2">{ordem.produto_nome}</h4>

                      <div className="flex items-center gap-2 mb-3 bg-orange-50 p-2 rounded border border-orange-100 text-orange-800 text-xs font-medium">
                        <ChefHat size={14} />
                        <span>{ordem.qtd_receitas} Panelas</span>
                        <span className="text-orange-400">|</span>
                        <span>{ordem.massa_total?.toFixed(1)} kg massa</span>
                      </div>

                      <div className="text-xs text-gray-500 space-y-1 mb-4">
                        {ordem.distribuicao.map((d, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>• {d.local}</span>
                            <span className="font-medium">{d.qtd}</span>
                          </div>
                        ))}
                      </div>

                      {/* Lógica do Botão: Expedição vs Movimentação Normal */}
                      <div className="mt-3">
                        {coluna.id === 'expedicao' ? (
                          <button
                            onClick={() => handleExpedir(ordem)}
                            className="w-full py-2 rounded flex items-center justify-center gap-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 shadow-sm transition-all"
                          >
                            <Package size={16} /> Gerar Romaneio
                          </button>
                        ) : (
                          <button
                            onClick={() => void moverOrdem(ordem.id, ordem.estagio)}
                            disabled={movendo === ordem.id}
                            className={`w-full py-2 rounded flex items-center justify-center gap-2 text-sm font-bold text-white transition-all
                              ${
                                coluna.id === 'planejamento'
                                  ? 'bg-blue-600 hover:bg-blue-700'
                                  : 'bg-slate-700 hover:bg-slate-800'
                              } ${movendo === ordem.id ? 'opacity-50 cursor-wait' : ''}`}
                          >
                            {coluna.id === 'planejamento' ? (
                              <>
                                Iniciar Produção <ChefHat size={16} />
                              </>
                            ) : (
                              <>
                                Próxima Etapa <ArrowRight size={16} />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Expedição / Romaneio */}
      {ordemParaExpedir && (
        <ModalExpedicao
          ordem={ordemParaExpedir}
          onClose={() => setOrdemParaExpedir(null)}
          onConfirmar={confirmarExpedicao}
        />
      )}
    </div>
  );
}

// --- COMPONENTE DE MODAL DE EXPEDIÇÃO ---
function ModalExpedicao({
  ordem,
  onClose,
  onConfirmar,
}: {
  ordem: OrdemKanban;
  onClose: () => void;
  onConfirmar: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 print:p-0 print:bg-white print:absolute print:inset-0 print:h-screen print:z-[9999]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden print:shadow-none print:w-full print:max-w-none print:rounded-none">
        {/* Cabeçalho */}
        <div className="bg-green-600 p-4 text-white print:bg-white print:text-black print:border-b print:p-0 print:mb-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Package className="print:hidden" /> Romaneio de Saída
            </h3>
            <button
              onClick={onClose}
              className="text-white hover:bg-green-700 rounded-full p-1 print:hidden"
            >
              <X size={20} />
            </button>
          </div>
          <p className="text-green-100 text-sm mt-1 print:text-gray-600">OP #{ordem.numero_op}</p>
        </div>

        {/* Conteúdo da Etiqueta */}
        <div className="p-6 space-y-6 print:p-0">
          <div className="text-center border-b pb-4 print:border-b-2 print:border-black">
            <h2 className="text-2xl font-bold text-gray-800 print:text-black print:text-3xl">
              {ordem.produto_nome}
            </h2>
            <p className="text-gray-500 print:text-black font-medium mt-2">
              Total: {ordem.quantidade_prevista} unidades
            </p>
          </div>

          <div className="space-y-3">
            <p className="font-bold text-sm text-gray-500 uppercase tracking-wider print:text-black">
              Distribuição / Destinos:
            </p>
            {ordem.distribuicao.map((dest, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center bg-gray-50 p-3 rounded border print:border-2 print:border-black print:bg-transparent print:mb-2"
              >
                <span className="font-bold text-lg text-gray-800 print:text-black">
                  {dest.local}
                </span>
                <span className="text-xl font-bold text-black">{dest.qtd} un</span>
              </div>
            ))}
          </div>

          <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800 border border-yellow-200 print:hidden">
            ⚠️ Confira as quantidades antes de liberar o motorista.
          </div>
        </div>

        {/* Rodapé com Ações (Escondido na impressão) */}
        <div className="bg-gray-50 p-4 flex gap-3 justify-end print:hidden border-t">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-white border border-gray-300 rounded text-gray-700 font-medium hover:bg-gray-100 flex items-center gap-2"
          >
            <Printer size={18} /> Imprimir
          </button>
          <button
            onClick={onConfirmar}
            className="px-4 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 shadow-lg flex items-center gap-2"
          >
            <CheckCircle size={18} /> Confirmar Envio
          </button>
        </div>
      </div>
    </div>
  );
}
