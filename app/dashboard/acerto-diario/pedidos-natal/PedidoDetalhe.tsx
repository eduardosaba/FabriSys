'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Download, MessageCircle, Pencil, Trash2, X } from 'lucide-react';
import { formatarData, rotuloRecebimento } from '@/lib/cardapio-natal';
import {
  STATUS_PEDIDO,
  classeStatus,
  somaItens,
  telefoneWhatsApp,
  totalGeral,
  type PedidoNatal,
} from '@/lib/cardapio-natal-pedidos';
import { compartilharOuBaixarPdf, gerarPdfPedido } from '@/lib/pedido-pdf';
import { brl, btnPerigo, btnPrimario, btnSecundario, dataHora, inputCls } from './ui';

interface Props {
  pedido: PedidoNatal;
  onFechar: () => void;
  onEditar: () => void;
  onExcluir: () => void;
  onStatus: (status: string) => void;
}

export default function PedidoDetalhe({
  pedido: p,
  onFechar,
  onEditar,
  onExcluir,
  onStatus,
}: Props) {
  const [gerando, setGerando] = useState(false);
  const wa = telefoneWhatsApp(p.cliente_telefone);
  const semConsulta = p.itens.some((i) => i.unitario == null);

  const baixarPdf = async () => {
    setGerando(true);
    try {
      const blob = await gerarPdfPedido({
        codigo: p.codigo,
        emitidoEm: new Date(p.criado_em).getTime(),
        linhas: p.itens.map((i) => ({
          nome: i.nome,
          qtd: i.qtd,
          unitario: i.unitario,
          subtotal: i.unitario == null ? null : i.unitario * i.qtd,
        })),
        total: somaItens(p.itens),
        temSobConsulta: semConsulta,
        taxaEntrega: p.taxa_entrega,
        cliente: {
          nome: p.cliente_nome,
          telefone: p.cliente_telefone ?? '',
          recebimento: p.recebimento,
          data: p.data_entrega ?? '',
          endereco: p.endereco ?? '',
          pagamento: p.pagamento ?? '',
          observacoes: p.observacoes ?? '',
        },
      });
      await compartilharOuBaixarPdf(blob, p.codigo, `Pedido ${p.codigo}`);
    } catch {
      toast.error('Não foi possível gerar o PDF.');
    } finally {
      setGerando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3"
      onClick={onFechar}
      role="presentation"
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl dark:bg-gray-900"
        role="dialog"
        aria-modal="true"
        aria-label={`Pedido ${p.codigo}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
          <div>
            <h2 className="text-lg font-bold">Pedido Nº {p.codigo}</h2>
            <p className="text-xs text-gray-500">
              Recebido em {dataHora(p.criado_em)} ·{' '}
              {p.origem === 'manual' ? 'lançado manualmente' : 'enviado pelo site'}
            </p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">Status:</span>
            <select
              value={p.status}
              onChange={(e) => onStatus(e.target.value)}
              className={`${inputCls} w-auto`}
              aria-label="Alterar status do pedido"
            >
              {STATUS_PEDIDO.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${classeStatus(p.status)}`}
            >
              {STATUS_PEDIDO.find((s) => s.id === p.status)?.label ?? p.status}
            </span>
          </div>

          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700">
            <dt className="font-semibold text-red-800 dark:text-red-300">Cliente</dt>
            <dd>{p.cliente_nome}</dd>
            <dt className="font-semibold text-red-800 dark:text-red-300">Telefone</dt>
            <dd>{p.cliente_telefone || '—'}</dd>
            <dt className="font-semibold text-red-800 dark:text-red-300">Recebimento</dt>
            <dd>{rotuloRecebimento(p.recebimento)}</dd>
            <dt className="font-semibold text-red-800 dark:text-red-300">Data da entrega</dt>
            <dd>{p.data_entrega ? formatarData(p.data_entrega) : '—'}</dd>
            {p.recebimento === 'entrega' && (
              <>
                <dt className="font-semibold text-red-800 dark:text-red-300">Endereço</dt>
                <dd>{p.endereco || '—'}</dd>
              </>
            )}
            <dt className="font-semibold text-red-800 dark:text-red-300">Pagamento</dt>
            <dd>{p.pagamento || '—'}</dd>
            {p.observacoes && (
              <>
                <dt className="font-semibold text-red-800 dark:text-red-300">Observações</dt>
                <dd>{p.observacoes}</dd>
              </>
            )}
          </dl>

          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-red-800 text-yellow-200">
                <tr>
                  <th className="px-3 py-2 text-left">Qtd</th>
                  <th className="px-3 py-2 text-left">Produto</th>
                  <th className="px-3 py-2 text-right">Unitário</th>
                  <th className="px-3 py-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {p.itens.map((i, idx) => (
                  <tr
                    key={`${i.id}-${idx}`}
                    className="border-t border-gray-100 dark:border-gray-800"
                  >
                    <td className="px-3 py-2 font-semibold">{i.qtd}x</td>
                    <td className="px-3 py-2">{i.nome}</td>
                    <td className="px-3 py-2 text-right">{brl(i.unitario)}</td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {brl(i.unitario == null ? null : i.unitario * i.qtd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-1 text-right text-sm">
            <div>
              Itens: <strong>{brl(somaItens(p.itens))}</strong>
            </div>
            {p.recebimento === 'entrega' && (
              <div>
                Taxa de entrega:{' '}
                <strong>{p.taxa_entrega == null ? 'a combinar' : brl(p.taxa_entrega)}</strong>
              </div>
            )}
            <div className="text-lg font-bold text-red-800 dark:text-red-300">
              Total: {brl(totalGeral({ total: somaItens(p.itens), taxa_entrega: p.taxa_entrega }))}
            </div>
            {semConsulta && (
              <div className="text-xs text-gray-500">Há itens sob consulta fora do total.</div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 border-t pt-3 dark:border-gray-700">
            <button type="button" className={btnPrimario} onClick={onEditar}>
              <Pencil size={16} /> Editar pedido
            </button>
            <button type="button" className={btnSecundario} onClick={baixarPdf} disabled={gerando}>
              <Download size={16} /> {gerando ? 'Gerando…' : 'PDF do pedido'}
            </button>
            {wa && (
              <a
                className={`${btnSecundario} text-green-700`}
                href={`https://wa.me/${wa}?text=${encodeURIComponent(`Olá, ${p.cliente_nome}! Sobre o seu pedido ${p.codigo} do cardápio natalino:`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={16} /> Falar com o cliente
              </a>
            )}
            <button type="button" className={`${btnPerigo} ml-auto`} onClick={onExcluir}>
              <Trash2 size={16} /> Excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
