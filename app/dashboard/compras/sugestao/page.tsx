'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import {
  ShoppingCart,
  Copy,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  ClipboardList,
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import Button from '@/components/Button'; // Usando seu componente compartilhado
import Loading from '@/components/ui/Loading'; // Ou use o Loader2 direto se preferir

// Tipo retornado pela função SQL calcular_compras_planejamento
interface ItemCalculado {
  insumo_id: string;
  nome_insumo: string;
  unidade: string;
  estoque_atual: number;
  qtd_necessaria: number; // Total necessário para as ordens planejadas
  saldo_final: number; // Estoque - Necessária (Se negativo, precisa comprar)
}

export default function SugestaoComprasPage() {
  const [itens, setItens] = useState<ItemCalculado[]>([]);
  const [loading, setLoading] = useState(true);

  // Carrega os dados do banco usando a função RPC
  const carregarDados = async () => {
    setLoading(true);
    try {
      // Chama a função SQL que criamos no passo anterior
      const rpcRes = (await supabase.rpc('calcular_compras_planejamento')) as unknown as {
        data?: unknown;
        error?: unknown;
      };

      const data = rpcRes.data;
      const error = rpcRes.error;

      if (error) throw error;
      const rows = (data ?? []) as unknown[];
      const mapped: ItemCalculado[] = rows.map((r) => {
        const obj = r as Record<string, unknown>;
        return {
          insumo_id: String(obj['insumo_id'] ?? ''),
          nome_insumo: String(obj['nome_insumo'] ?? ''),
          unidade: String(obj['unidade'] ?? ''),
          estoque_atual: Number(obj['estoque_atual'] ?? 0),
          qtd_necessaria: Number(obj['qtd_necessaria'] ?? 0),
          saldo_final: Number(obj['saldo_final'] ?? 0),
        };
      });
      setItens(mapped);

      if (mapped.length > 0) {
        toast.success('Cálculo de necessidades atualizado!');
      }
    } catch (error) {
      const formatError = (e: unknown) => {
        if (!e) return String(e);
        if (e instanceof Error) return `${e.message}${e.stack ? '\n' + e.stack : ''}`;
        try {
          // inclui propriedades não enumeráveis (como message)
          return JSON.stringify(e, Object.getOwnPropertyNames(e), 2);
        } catch {
          return String(e);
        }
      };

      // Log cru e formatado para facilitar depuração no devtools
      console.error('Erro ao calcular MRP — raw:', error);
      console.error('Erro ao calcular MRP — formatted:', formatError(error));

      const msg =
        error && typeof error === 'object' && 'message' in (error as Record<string, unknown>)
          ? String((error as Record<string, unknown>)['message'])
          : 'Erro ao calcular necessidades de compra.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void carregarDados();
  }, []);

  // Separa o que precisa comprar do que está ok
  const itensParaComprar = itens.filter((i) => i.saldo_final < 0);
  const itensComEstoque = itens.filter((i) => i.saldo_final >= 0);

  // Função para copiar lista para o WhatsApp/Email
  const copiarLista = () => {
    const cabecalho = `🛒 *LISTA DE COMPRAS - ${new Date().toLocaleDateString()}*\n\n`;
    const corpo = itensParaComprar
      .map((i) => `[ ] ${i.nome_insumo}: *${Math.abs(i.saldo_final).toFixed(2)} ${i.unidade}*`)
      .join('\n');

    const rodape = `\nTotal de itens: ${itensParaComprar.length}`;

    void navigator.clipboard.writeText(cabecalho + corpo + rodape);
    toast.success('Lista copiada! Pode colar no WhatsApp.');
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto h-10 w-10 animate-spin text-blue-500 mb-4" />
          <p className="text-gray-500">Analisando estoque e ordens planejadas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-up">
      <Toaster position="top-right" />

      <PageHeader
        title="Sugestão de Compras (MRP)"
        description="O sistema analisa o que foi planejado para os PDVs e compara com o estoque atual."
        icon={ClipboardList}
      >
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => void carregarDados()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Recalcular
          </Button>

          <Button
            onClick={copiarLista}
            disabled={itensParaComprar.length === 0}
            className={itensParaComprar.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copiar Lista
          </Button>
        </div>
      </PageHeader>

      {/* Resumo Rápido */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Itens para Comprar</p>
            <p className="text-2xl font-bold text-red-600">{itensParaComprar.length}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
            <AlertCircle size={20} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Itens em Estoque</p>
            <p className="text-2xl font-bold text-green-600">{itensComEstoque.length}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
            <CheckCircle size={20} />
          </div>
        </div>
        <div
          className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm flex items-center justify-between cursor-pointer hover:bg-blue-100 transition-colors"
          onClick={() => (window.location.href = '/dashboard/compras/pedidos')}
        >
          <div>
            <p className="text-sm text-blue-700 font-medium">Ir para Pedidos</p>
            <p className="text-xs text-blue-500">Formalizar compra com fornecedor</p>
          </div>
          <ArrowRight className="text-blue-600" size={20} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* COLUNA DA ESQUERDA: O QUE FALTA (URGENTE) */}
        <div className="flex flex-col gap-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-500"></span>
            Necessidade de Compra
          </h3>

          {itensParaComprar.length === 0 ? (
            <div className="p-8 bg-green-50 border border-green-200 rounded-xl text-center text-green-800">
              <CheckCircle className="mx-auto h-12 w-12 mb-3 opacity-50" />
              <p className="font-medium">Tudo certo!</p>
              <p className="text-sm mt-1">O estoque atual cobre toda a produção planejada.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-red-50 text-red-900 font-medium">
                  <tr>
                    <th className="px-4 py-3">Insumo</th>
                    <th className="px-4 py-3 text-right">Estoque</th>
                    <th className="px-4 py-3 text-right">Precisa</th>
                    <th className="px-4 py-3 text-right font-bold">FALTA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-50">
                  {itensParaComprar.map((item) => (
                    <tr key={item.insumo_id} className="hover:bg-red-50/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-700">{item.nome_insumo}</td>
                      <td className="px-4 py-3 text-right text-slate-500">
                        {item.estoque_atual.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500">
                        {item.qtd_necessaria.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                          {Math.abs(item.saldo_final).toFixed(2)} {item.unidade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* COLUNA DA DIREITA: O QUE TEMOS (INFORMATIVO) */}
        <div className="flex flex-col gap-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-green-500"></span>
            Estoque Suficiente
          </h3>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {itensComEstoque.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">Nenhum insumo analisado.</div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 font-medium sticky top-0">
                    <tr>
                      <th className="px-4 py-3">Insumo</th>
                      <th className="px-4 py-3 text-right">Saldo Final (Estimado)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itensComEstoque.map((item) => (
                      <tr key={item.insumo_id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-600">{item.nome_insumo}</td>
                        <td className="px-4 py-3 text-right font-medium text-green-600">
                          {item.saldo_final.toFixed(2)} {item.unidade}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
