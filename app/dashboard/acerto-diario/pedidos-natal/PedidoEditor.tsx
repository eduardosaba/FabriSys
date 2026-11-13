'use client';

import { useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Minus, Plus, Save, Trash2, X } from 'lucide-react';
import { FORMAS_PAGAMENTO, codigoPedido, type ProdutoCardapio } from '@/lib/cardapio-natal';
import {
  STATUS_PEDIDO,
  somaItens,
  type ItemRegistro,
  type PedidoNatal,
} from '@/lib/cardapio-natal-pedidos';
import { brl, btnPrimario, btnSecundario, inputCls } from './ui';

export type DadosPedido = Omit<PedidoNatal, 'id' | 'criado_em' | 'atualizado_em'>;

interface Props {
  pedido: PedidoNatal | null; // null = novo pedido manual
  produtos: ProdutoCardapio[];
  onSalvar: (dados: DadosPedido, id?: string) => Promise<boolean>;
  onFechar: () => void;
}

export default function PedidoEditor({ pedido, produtos, onSalvar, onFechar }: Props) {
  const [nome, setNome] = useState(pedido?.cliente_nome ?? '');
  const [telefone, setTelefone] = useState(pedido?.cliente_telefone ?? '');
  const [recebimento, setRecebimento] = useState<'retirada' | 'entrega'>(
    pedido?.recebimento ?? 'retirada'
  );
  const [dataEntrega, setDataEntrega] = useState(pedido?.data_entrega ?? '');
  const [endereco, setEndereco] = useState(pedido?.endereco ?? '');
  const [pagamento, setPagamento] = useState(pedido?.pagamento ?? FORMAS_PAGAMENTO[0]);
  const [observacoes, setObservacoes] = useState(pedido?.observacoes ?? '');
  const [status, setStatus] = useState(pedido?.status ?? 'aberto');
  const [taxa, setTaxa] = useState(pedido?.taxa_entrega != null ? String(pedido.taxa_entrega) : '');
  const [itens, setItens] = useState<ItemRegistro[]>(pedido?.itens ?? []);
  const [novoProduto, setNovoProduto] = useState('');
  const [salvando, setSalvando] = useState(false);

  const total = useMemo(() => somaItens(itens), [itens]);
  const taxaNum = taxa.trim() === '' ? null : Number(taxa.replace(',', '.'));
  const totalComTaxa =
    total + (recebimento === 'entrega' && taxaNum != null && !Number.isNaN(taxaNum) ? taxaNum : 0);

  const mudarQtd = (idx: number, qtd: number) =>
    setItens((l) =>
      qtd < 1
        ? l.filter((_, i) => i !== idx)
        : l.map((it, i) => (i === idx ? { ...it, qtd: Math.min(999, qtd) } : it))
    );

  const mudarPreco = (idx: number, v: string) =>
    setItens((l) =>
      l.map((it, i) =>
        i === idx ? { ...it, unitario: v.trim() === '' ? null : Number(v.replace(',', '.')) } : it
      )
    );

  const adicionarProduto = () => {
    const prod = produtos.find((p) => p.id === novoProduto);
    if (!prod) return;
    setItens((l) => {
      const i = l.findIndex((x) => x.id === prod.id);
      if (i >= 0) return l.map((x, k) => (k === i ? { ...x, qtd: x.qtd + 1 } : x));
      return [...l, { id: prod.id, nome: prod.nome, qtd: 1, unitario: prod.preco }];
    });
    setNovoProduto('');
  };

  const salvar = async () => {
    if (nome.trim().length < 2) return toast.error('Informe o nome do cliente.');
    if (itens.length === 0) return toast.error('Inclua ao menos um item.');
    if (taxaNum != null && (Number.isNaN(taxaNum) || taxaNum < 0))
      return toast.error('Taxa de entrega inválida.');
    if (itens.some((i) => i.unitario != null && (Number.isNaN(i.unitario) || i.unitario < 0))) {
      return toast.error('Há um preço unitário inválido.');
    }
    setSalvando(true);
    const ok = await onSalvar(
      {
        codigo:
          pedido?.codigo ??
          codigoPedido(
            Date.now(),
            itens.map((i) => ({ id: i.id, qtd: i.qtd }))
          ),
        status,
        cliente_nome: nome.trim(),
        cliente_telefone: telefone.trim() || null,
        recebimento,
        data_entrega: dataEntrega || null,
        endereco: recebimento === 'entrega' ? endereco.trim() || null : null,
        pagamento: pagamento || null,
        observacoes: observacoes.trim() || null,
        itens,
        total,
        taxa_entrega: recebimento === 'entrega' ? taxaNum : null,
        origem: pedido?.origem ?? 'manual',
      },
      pedido?.id
    );
    setSalvando(false);
    if (ok) onFechar();
  };

  const produtosAtivos = produtos.filter((p) => p.ativo);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-3"
      onClick={onFechar}
      role="presentation"
    >
      <div
        className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl dark:bg-gray-900"
        role="dialog"
        aria-modal="true"
        aria-label={pedido ? `Editar pedido ${pedido.codigo}` : 'Novo pedido'}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
          <h2 className="text-lg font-bold">
            {pedido ? `Editar pedido Nº ${pedido.codigo}` : 'Novo pedido (manual)'}
          </h2>
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
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm font-medium">
              Nome do cliente *
              <input
                className={`${inputCls} mt-1`}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                maxLength={80}
              />
            </label>
            <label className="text-sm font-medium">
              Telefone / WhatsApp
              <input
                className={`${inputCls} mt-1`}
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                maxLength={25}
                inputMode="tel"
              />
            </label>
            <label className="text-sm font-medium">
              Recebimento
              <select
                className={`${inputCls} mt-1`}
                value={recebimento}
                onChange={(e) => setRecebimento(e.target.value as 'retirada' | 'entrega')}
              >
                <option value="retirada">Retirada na loja</option>
                <option value="entrega">Entrega</option>
              </select>
            </label>
            <label className="text-sm font-medium">
              Data da entrega / retirada
              <input
                type="date"
                className={`${inputCls} mt-1`}
                value={dataEntrega}
                onChange={(e) => setDataEntrega(e.target.value)}
              />
            </label>
            {recebimento === 'entrega' && (
              <>
                <label className="text-sm font-medium md:col-span-2">
                  Endereço de entrega
                  <textarea
                    className={`${inputCls} mt-1`}
                    rows={2}
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    maxLength={200}
                  />
                </label>
                <label className="text-sm font-medium">
                  Taxa de entrega (R$)
                  <input
                    className={`${inputCls} mt-1`}
                    value={taxa}
                    onChange={(e) => setTaxa(e.target.value)}
                    inputMode="decimal"
                    placeholder="vazio = a combinar / sem taxa"
                  />
                </label>
              </>
            )}
            <label className="text-sm font-medium">
              Forma de pagamento
              <select
                className={`${inputCls} mt-1`}
                value={pagamento}
                onChange={(e) => setPagamento(e.target.value)}
              >
                {[
                  ...FORMAS_PAGAMENTO,
                  ...(pagamento && !(FORMAS_PAGAMENTO as readonly string[]).includes(pagamento)
                    ? [pagamento]
                    : []),
                ].map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Status
              <select
                className={`${inputCls} mt-1`}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {STATUS_PEDIDO.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-sm font-medium">
            Observações
            <textarea
              className={`${inputCls} mt-1`}
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              maxLength={300}
            />
          </label>

          <div>
            <h3 className="mb-2 text-sm font-bold">Itens do pedido</h3>
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 text-left dark:bg-gray-800">
                  <tr>
                    <th className="px-3 py-2">Produto</th>
                    <th className="px-3 py-2">Qtd</th>
                    <th className="px-3 py-2">Unitário (R$)</th>
                    <th className="px-3 py-2 text-right">Subtotal</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {itens.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-gray-500">
                        Nenhum item. Adicione produtos abaixo.
                      </td>
                    </tr>
                  )}
                  {itens.map((it, idx) => (
                    <tr
                      key={`${it.id}-${idx}`}
                      className="border-t border-gray-100 dark:border-gray-800"
                    >
                      <td className="px-3 py-2">{it.nome}</td>
                      <td className="px-3 py-2">
                        <div className="inline-flex items-center rounded-full border border-red-300">
                          <button
                            type="button"
                            className="p-1.5"
                            onClick={() => mudarQtd(idx, it.qtd - 1)}
                            aria-label="Diminuir"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-8 text-center font-semibold">{it.qtd}</span>
                          <button
                            type="button"
                            className="p-1.5"
                            onClick={() => mudarQtd(idx, it.qtd + 1)}
                            aria-label="Aumentar"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className={`${inputCls} w-28`}
                          value={it.unitario == null ? '' : String(it.unitario)}
                          onChange={(e) => mudarPreco(idx, e.target.value)}
                          inputMode="decimal"
                          placeholder="sob consulta"
                          aria-label={`Preço unitário de ${it.nome}`}
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {brl(it.unitario == null ? null : it.unitario * it.qtd)}
                      </td>
                      <td className="px-2">
                        <button
                          type="button"
                          onClick={() => mudarQtd(idx, 0)}
                          aria-label={`Remover ${it.nome}`}
                        >
                          <Trash2 size={16} className="text-red-600" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              <select
                className={`${inputCls} w-auto min-w-[16rem] flex-1`}
                value={novoProduto}
                onChange={(e) => setNovoProduto(e.target.value)}
                aria-label="Produto a adicionar"
              >
                <option value="">Adicionar produto do cardápio…</option>
                {produtosAtivos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} — {brl(p.preco)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={btnSecundario}
                onClick={adicionarProduto}
                disabled={!novoProduto}
              >
                <Plus size={16} /> Adicionar
              </button>
            </div>

            <p className="mt-3 text-right text-sm">
              Itens: <strong>{brl(total)}</strong>
              {recebimento === 'entrega' && taxaNum != null && !Number.isNaN(taxaNum) && (
                <>
                  {' '}
                  · Entrega: <strong>{brl(taxaNum)}</strong>
                </>
              )}
              <span className="ml-3 text-lg font-bold text-red-800 dark:text-red-300">
                Total: {brl(totalComTaxa)}
              </span>
            </p>
          </div>

          <div className="flex justify-end gap-2 border-t pt-3 dark:border-gray-700">
            <button type="button" className={btnSecundario} onClick={onFechar}>
              Cancelar
            </button>
            <button type="button" className={btnPrimario} onClick={salvar} disabled={salvando}>
              <Save size={16} /> {salvando ? 'Salvando…' : 'Salvar pedido'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
