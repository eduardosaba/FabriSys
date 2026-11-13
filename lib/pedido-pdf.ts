import {
  PRAZO_TEXTO,
  formatarData,
  formatarPreco,
  rotuloRecebimento,
  type ClientePedido,
  type LinhaPedido,
} from '@/lib/cardapio-natal';

export interface DadosPdf {
  codigo: string;
  emitidoEm: number;
  linhas: LinhaPedido[];
  total: number;
  temSobConsulta: boolean;
  cliente: ClientePedido;
  taxaEntrega?: number | null; // definida pela Larissa; se ausente, aparece "a combinar"
}

// Paleta do cardápio
const VINHO: [number, number, number] = [149, 0, 0];
const VINHO_ESCURO: [number, number, number] = [90, 8, 14];
const DOURADO: [number, number, number] = [217, 180, 90];
const CREME: [number, number, number] = [255, 248, 238];
const TEXTO: [number, number, number] = [58, 10, 14];

const moeda = (v: number | null) =>
  v == null
    ? 'sob consulta'
    : formatarPreco(v).replace(new RegExp(String.fromCharCode(160), 'g'), ' ');

async function carregarImagem(url: string): Promise<string | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const blob = await r.blob();
    return await new Promise<string>((ok, erro) => {
      const fr = new FileReader();
      fr.onload = () => ok(String(fr.result));
      fr.onerror = erro;
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Gera o PDF do pedido no navegador (nada é enviado a servidor). */
export async function gerarPdfPedido(d: DadosPdf): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const H = 297;
  const M = 14;

  const cabecalho = await carregarImagem('/cardapionatal/pedido-header.jpg');
  const rodape = () => {
    doc.setFillColor(...VINHO_ESCURO);
    doc.rect(0, H - 14, W, 14, 'F');
    doc.setTextColor(...DOURADO);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(
      `Pedido sujeito a confirmação da Larissa Saba Gourmet  |  Encomendas até ${PRAZO_TEXTO}  |  WhatsApp (75) 98803-1197`,
      W / 2,
      H - 5.5,
      { align: 'center' }
    );
  };

  // ---------- Página 1: banner ----------
  let y: number;
  if (cabecalho) {
    const alturaBanner = (W * 370) / 1080; // proporção da imagem
    doc.addImage(cabecalho, 'JPEG', 0, 0, W, alturaBanner);
    y = alturaBanner + 6;
  } else {
    doc.setFillColor(...VINHO);
    doc.rect(0, 0, W, 40, 'F');
    doc.setTextColor(...DOURADO);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('Larissa Saba Gourmet', W / 2, 24, { align: 'center' });
    y = 46;
  }

  doc.setTextColor(...VINHO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Pedido de Natal', M, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...TEXTO);
  const emitido = new Date(d.emitidoEm).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
  doc.text(`Nº ${d.codigo}   |   emitido em ${emitido}`, W - M, y + 4, { align: 'right' });
  y += 11;

  // ---------- Dados do cliente ----------
  const c = d.cliente;
  const campos: [string, string][] = [
    ['Cliente', c.nome],
    ['Telefone', c.telefone],
    ['Recebimento', rotuloRecebimento(c.recebimento)],
    ['Data desejada', formatarData(c.data)],
    ['Pagamento', c.pagamento],
  ];
  const endereco =
    c.recebimento === 'entrega' ? doc.splitTextToSize(c.endereco, W - 2 * M - 40) : [];
  const alturaCliente = 8 + campos.length * 6 + (endereco.length ? endereco.length * 5 + 2 : 0);
  doc.setFillColor(...CREME);
  doc.setDrawColor(...DOURADO);
  doc.setLineWidth(0.5);
  doc.roundedRect(M, y, W - 2 * M, alturaCliente, 3, 3, 'FD');
  let cy = y + 7;
  doc.setFontSize(10);
  for (const [k, v] of campos) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...VINHO);
    doc.text(`${k}:`, M + 5, cy);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXTO);
    doc.text(v || '-', M + 38, cy);
    cy += 6;
  }
  if (endereco.length) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...VINHO);
    doc.text('Endereço:', M + 5, cy);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXTO);
    doc.text(endereco, M + 38, cy);
  }
  y += alturaCliente + 8;

  // ---------- Tabela de itens ----------
  const colQtd = M + 4;
  const colNome = M + 18;
  const colUnit = W - M - 42;
  const colSub = W - M - 3;

  const cabecalhoTabela = () => {
    doc.setFillColor(...VINHO);
    doc.roundedRect(M, y, W - 2 * M, 8, 2, 2, 'F');
    doc.setTextColor(...DOURADO);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('Qtd', colQtd, y + 5.4);
    doc.text('Produto', colNome, y + 5.4);
    doc.text('Unitário', colUnit, y + 5.4, { align: 'right' });
    doc.text('Subtotal', colSub, y + 5.4, { align: 'right' });
    y += 10;
  };

  const novaPagina = () => {
    rodape();
    doc.addPage();
    doc.setFillColor(...VINHO);
    doc.rect(0, 0, W, 16, 'F');
    doc.setTextColor(...DOURADO);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`Larissa Saba Gourmet  |  Pedido ${d.codigo}`, M, 10.5);
    y = 24;
  };

  cabecalhoTabela();
  doc.setFontSize(10);
  d.linhas.forEach((l, i) => {
    const nomeLinhas: string[] = doc.splitTextToSize(l.nome, colUnit - colNome - 22);
    const altura = Math.max(7, nomeLinhas.length * 4.8 + 3);
    if (y + altura > H - 60) {
      novaPagina();
      cabecalhoTabela();
      doc.setFontSize(10);
    }
    if (i % 2 === 0) {
      doc.setFillColor(...CREME);
      doc.rect(M, y - 1, W - 2 * M, altura, 'F');
    }
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...VINHO);
    doc.text(`${l.qtd}x`, colQtd, y + 4.2);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXTO);
    doc.text(nomeLinhas, colNome, y + 4.2);
    doc.text(moeda(l.unitario), colUnit, y + 4.2, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(moeda(l.subtotal), colSub, y + 4.2, { align: 'right' });
    y += altura;
  });

  // ---------- Totais ----------
  if (y > H - 75) novaPagina();
  y += 4;
  doc.setDrawColor(...DOURADO);
  doc.setLineWidth(0.6);
  doc.line(M, y, W - M, y);
  y += 9;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...VINHO);
  doc.text('Total dos itens', M + 4, y);
  doc.text(moeda(d.total), colSub, y, { align: 'right' });
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...TEXTO);
  if (d.temSobConsulta) {
    doc.text('Há itens sob consulta, que não entram neste total.', M + 4, y);
    y += 5;
  }
  if (c.recebimento === 'entrega' && d.taxaEntrega == null) {
    doc.text(
      'Taxa de entrega: a combinar com a Larissa pelo WhatsApp (não inclusa no total).',
      M + 4,
      y
    );
    y += 5;
  }
  if (c.recebimento === 'entrega' && d.taxaEntrega != null) {
    y += 2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(...TEXTO);
    doc.text('Taxa de entrega', M + 4, y);
    doc.text(moeda(d.taxaEntrega), colSub, y, { align: 'right' });
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...VINHO);
    doc.text('Total com entrega', M + 4, y);
    doc.text(moeda(d.total + d.taxaEntrega), colSub, y, { align: 'right' });
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...TEXTO);
  }

  if (c.observacoes.trim()) {
    y += 4;
    const obs: string[] = doc.splitTextToSize(c.observacoes.trim(), W - 2 * M - 10);
    const altObs = obs.length * 4.8 + 12;
    if (y + altObs > H - 20) novaPagina();
    doc.setFillColor(...CREME);
    doc.setDrawColor(...DOURADO);
    doc.roundedRect(M, y, W - 2 * M, altObs, 3, 3, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...VINHO);
    doc.text('Observações', M + 5, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXTO);
    doc.text(obs, M + 5, y + 13);
  }

  rodape();
  return doc.output('blob');
}

export function nomeArquivoPedido(codigo: string): string {
  return `pedido-natal-larissa-saba-${codigo}.pdf`;
}

/** Compartilha o PDF pelo menu do aparelho (celular) ou baixa o arquivo (computador). */
export async function compartilharOuBaixarPdf(
  blob: Blob,
  codigo: string,
  texto: string
): Promise<'compartilhado' | 'baixado'> {
  const arquivo = new File([blob], nomeArquivoPedido(codigo), { type: 'application/pdf' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [arquivo] })) {
    try {
      await nav.share({ files: [arquivo], title: `Pedido ${codigo}`, text: texto });
      return 'compartilhado';
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return 'compartilhado'; // usuário cancelou
      /* cai para o download */
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivoPedido(codigo);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return 'baixado';
}
