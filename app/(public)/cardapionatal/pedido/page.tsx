import type { Metadata } from 'next';
import PedidoResumo from '@/components/cardapionatal/PedidoResumo';
import '@/components/cardapionatal/flipbook.css';
import { carregarDados } from '@/lib/cardapio-natal-dados';
import { codigoPedido, decodificarPedido, montarLinhas, totalLinhas } from '@/lib/cardapio-natal';

export const metadata: Metadata = {
  title: 'Pedido de Natal | Larissa Saba Gourmet',
  robots: { index: false, follow: false }, // link privado de pedido
};

export default async function PedidoPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const { d } = await searchParams;
  const pedido = decodificarPedido(d);

  if (!pedido) {
    return (
      <main className="cn-pedido-page">
        <div className="cn-pedido-card">
          <h1>Pedido não encontrado</h1>
          <p>O link está incompleto ou inválido. Peça ao cliente para gerar o pedido novamente.</p>
        </div>
      </main>
    );
  }

  // Preços SEMPRE do cardápio atual (o link só leva ids e quantidades).
  const { produtos } = await carregarDados();
  const linhas = montarLinhas(pedido.itens, produtos);
  const { total, temSobConsulta } = totalLinhas(linhas);
  const codigo = codigoPedido(pedido.emitidoEm, pedido.itens);

  return (
    <PedidoResumo
      codigo={codigo}
      emitidoEm={pedido.emitidoEm}
      cliente={pedido.cliente}
      linhas={linhas}
      total={total}
      temSobConsulta={temSobConsulta}
    />
  );
}
