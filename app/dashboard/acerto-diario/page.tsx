'use client';

import { useState, useEffect } from 'react';
import BRLCurrencyInput from '@/components/ui/shared/BRLCurrencyInput';

import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/useToast';
import { PDVSelectorCards } from '@/components/ui/shared/PDVSelectorCards';
import {
  AlertCircle,
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  FileText,
  Layers,
  ListOrdered,
  MinusCircle,
  Package,
  Plus,
  PlusCircle,
  Printer,
  Store,
  Trash2,
  User,
} from 'lucide-react';

interface LocalPDV {
  id: string;
  nome: string;
}

interface ProdutoItem {
  id: string;
  nome: string;
  preco: number;
}

interface ItemGrade {
  produto_id: string;
  nome: string;
  preco_unitario: number;
  qtd_sobra_anterior: number;
  qtd_enviada: number;
  qtd_retorno: number;
}

interface PerdaAjuste {
  id: string;
  descricao: string;
  valor: number;
}

export default function AcertoDiarioPage() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const { toast } = useToast();

  const [locais, setLocais] = useState<LocalPDV[]>([]);
  const [produtosBase, setProdutosBase] = useState<ProdutoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Modo de Operação: 'detalhado' (Romaneio / Substitui Caderno) ou 'rapido' (Volume Global)
  const [modo, setModo] = useState<'detalhado' | 'rapido'>('detalhado');

  // Tipo de Fechamento: 'diario' (Padrão), 'parcial' (Sobra Acumulada no PDV) ou 'semanal' (Encerramento do Ciclo)
  const [tipoFechamento, setTipoFechamento] = useState<'diario' | 'parcial' | 'semanal'>('parcial');

  // Identificação da Carga/Turno
  const [localId, setLocalId] = useState<string>('');
  const [dataAcerto, setDataAcerto] = useState<string>(new Date().toISOString().split('T')[0]);
  const [turno, setTurno] = useState<'manha' | 'tarde' | 'noite' | 'integral'>('integral');
  const [vendedorNome, setVendedorNome] = useState<string>('');

  // Estados do Modo Rápido
  const [qtdEnviadaRapida, setQtdEnviadaRapida] = useState<number>(0);
  const [qtdRetornoRapida, setQtdRetornoRapida] = useState<number>(0);
  const [precoMedioRapido, setPrecoMedioRapido] = useState<number>(8.0);

  // Estados do Modo Detalhado (Romaneio)
  const [gradeItens, setGradeItens] = useState<ItemGrade[]>([]);

  // Perdas / Avarias / Cortesias
  const [perdasList, setPerdasList] = useState<PerdaAjuste[]>([]);
  const [novaPerdaDesc, setNovaPerdaDesc] = useState('');
  const [novaPerdaValor, setNovaPerdaValor] = useState<number>(0);

  // Recebimentos do PDV
  const [valorDinheiro, setValorDinheiro] = useState<number>(0);
  const [valorPix, setValorPix] = useState<number>(0);
  const [valorCartao, setValorCartao] = useState<number>(0);
  const [observacoes, setObservacoes] = useState<string>('');

  // Carregar PDVs e Produtos
  useEffect(() => {
    async function carregarDadosIniciais() {
      setLoading(true);
      try {
        // Carregar PDVs (apenas pontos de venda, excluindo a Fábrica)
        let queryLocais = supabase.from('locais').select('id, nome, tipo');
        if (profile?.organization_id) {
          queryLocais = queryLocais.eq('organization_id', profile.organization_id);
        }
        const { data: dataLocais } = await queryLocais.order('nome');

        if (dataLocais && dataLocais.length > 0) {
          const pdvsApenas = dataLocais.filter((loc) => {
            const tipoLower = String(loc.tipo || '').toLowerCase();
            const nomeLower = String(loc.nome || '').toLowerCase();
            return (
              tipoLower !== 'fabrica' &&
              tipoLower !== 'fábrica' &&
              tipoLower !== 'producao' &&
              tipoLower !== 'produção' &&
              !nomeLower.includes('fábrica') &&
              !nomeLower.includes('fabrica')
            );
          });

          const listaFinal = pdvsApenas.length > 0 ? pdvsApenas : dataLocais;
          setLocais(listaFinal);
          setLocalId(listaFinal[0].id);
        }

        // Carregar Produtos Finais cadastrados na confeitaria
        let queryProds = supabase.from('produtos_finais').select('id, nome, preco_venda');
        if (profile?.organization_id) {
          queryProds = queryProds.eq('organization_id', profile.organization_id);
        }
        const { data: dataProds } = await queryProds.order('nome');

        let lista: ProdutoItem[] = [];
        if (dataProds && dataProds.length > 0) {
          lista = dataProds.map((p) => ({
            id: p.id,
            nome: p.nome,
            preco: Number(p.preco_venda) || 8.0,
          }));
        } else {
          // Preset padrão para Confeitaria caso ainda não tenha cadastrado produtos
          lista = [
            { id: '1', nome: 'Empada Doce', preco: 9.0 },
            { id: '2', nome: 'Empada Salgada', preco: 8.0 },
            { id: '3', nome: 'Brigadeiro Gourmet', preco: 6.0 },
            { id: '4', nome: 'Cookie Recheado', preco: 10.0 },
            { id: '5', nome: 'Brownie de Chocolate', preco: 8.0 },
          ];
        }

        setProdutosBase(lista);
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      } finally {
        setLoading(false);
      }
    }

    carregarDadosIniciais();
  }, [profile?.organization_id]);

  // Carregar Sobra Anterior do PDV Selecionado sempre que mudar o localId ou produtosBase
  useEffect(() => {
    async function carregarSobraAnterior() {
      if (!profile?.organization_id || !localId || produtosBase.length === 0) return;

      try {
        // Buscar o último romaneio do PDV
        const { data: ultimoRomaneio } = await supabase
          .from('remessas_cargas_pdv')
          .select('itens_grade, modo_lancamento')
          .eq('organization_id', profile.organization_id)
          .eq('local_id', localId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const sobraMap: Record<string, number> = {};

        if (ultimoRomaneio?.itens_grade && Array.isArray(ultimoRomaneio.itens_grade)) {
          ultimoRomaneio.itens_grade.forEach((it: any) => {
            if (it.produto_id) {
              const prevAnterior = Number(it.qtd_sobra_anterior) || 0;
              const prevEnviada = Number(it.qtd_enviada) || 0;
              const prevRetorno = Number(it.qtd_retorno) || 0;

              // Sobra remanescente que ficou no PDV do último lançamento
              // Se o último foi parcial, a sobra é (Anterior + Enviada) - Vendidos (Retorno Declarado)
              const disponivelAnterior = prevAnterior + prevEnviada;
              const sobraRemanescente = Math.max(0, disponivelAnterior - prevRetorno);
              sobraMap[it.produto_id] = sobraRemanescente;
            }
          });
        }

        setGradeItens(
          produtosBase.map((p) => ({
            produto_id: p.id,
            nome: p.nome,
            preco_unitario: p.preco,
            qtd_sobra_anterior: sobraMap[p.id] || 0,
            qtd_enviada: 0,
            qtd_retorno: 0,
          }))
        );
      } catch (err) {
        console.error('Erro ao carregar sobra anterior:', err);
        setGradeItens(
          produtosBase.map((p) => ({
            produto_id: p.id,
            nome: p.nome,
            preco_unitario: p.preco,
            qtd_sobra_anterior: 0,
            qtd_enviada: 0,
            qtd_retorno: 0,
          }))
        );
      }
    }

    carregarSobraAnterior();
  }, [profile?.organization_id, localId, produtosBase]);

  const handleGerarComprovantePDF = () => {
    const localNome = locais.find((l) => l.id === localId)?.nome || 'PDV';
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const nomeEmpresa =
      profile?.organizations?.nome || profile?.organization_name || theme?.name || 'Larissa Saba';
    const dataAtual = new Date(dataAcerto + 'T12:00:00').toLocaleDateString('pt-BR');
    const tipoLabel =
      tipoFechamento === 'parcial'
        ? '🔵 Fechamento Parcial (Sobra em Loja)'
        : tipoFechamento === 'semanal'
          ? '🟣 Encerramento Semanal'
          : '🟢 Fechamento Padrão';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Comprovante de Romaneio — ${nomeEmpresa} (${localNome})</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; margin: 20px; font-size: 12px; color: #000; width: 340px; margin: 0 auto; background: #fff; }
            .ticket { border: 1px dashed #000; padding: 12px; }
            .text-center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .flex-between { display: flex; justify-content: space-between; }
            table { width: 100%; font-size: 11px; border-collapse: collapse; }
            th, td { text-align: left; padding: 3px 0; }
            .text-right { text-align: right; }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="text-center bold">
              <h2 style="margin:0; font-size: 15px; text-transform: uppercase;">${nomeEmpresa}</h2>
              <p style="margin: 2px 0;">Comprovante de Romaneio & Fechamento</p>
            </div>
            <div class="divider"></div>
            <div>
              <p style="margin:2px 0;"><strong>PDV:</strong> ${localNome}</p>
              <p style="margin:2px 0;"><strong>Data:</strong> ${dataAtual} (${turno.toUpperCase()})</p>
              <p style="margin:2px 0;"><strong>Atendente:</strong> ${vendedorNome || 'Não informado'}</p>
              <p style="margin:2px 0;"><strong>Tipo:</strong> ${tipoLabel}</p>
            </div>
            <div class="divider"></div>
            <div class="bold text-center">ITENS DO ROMANEIO</div>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th class="text-center">Disp</th>
                  <th class="text-center">Sob</th>
                  <th class="text-right">Vend</th>
                </tr>
              </thead>
              <tbody>
                ${gradeItens
                  .map((it) => {
                    const disp = (it.qtd_sobra_anterior || 0) + (it.qtd_enviada || 0);
                    const vend = Math.max(0, disp - (it.qtd_retorno || 0));
                    return `
                    <tr>
                      <td>${it.nome}</td>
                      <td class="text-center">${disp}</td>
                      <td class="text-center">${it.qtd_retorno || 0}</td>
                      <td class="text-right"><strong>${vend}</strong></td>
                    </tr>
                  `;
                  })
                  .join('')}
              </tbody>
            </table>
            <div class="divider"></div>
            <div class="flex-between"><span>Unidades Vendidas:</span><strong>${totalVendidos} un</strong></div>
            <div class="flex-between"><span>Faturamento Bruto:</span><strong>R$ ${faturamentoTeorico.toFixed(2)}</strong></div>
            ${totalPerdas > 0 ? `<div class="flex-between" style="color:red;"><span>Ajustes/Perdas:</span><span>-R$ ${totalPerdas.toFixed(2)}</span></div>` : ''}
            <div class="divider"></div>
            <div class="bold text-center">RECEBIMENTOS</div>
            <div class="flex-between"><span>Vendas Dinheiro:</span><strong>R$ ${valorDinheiro.toFixed(2)}</strong></div>
            <div class="flex-between"><span>Vendas Pix/Cartão Esperado:</span><strong>R$ ${pixCartaoEsperado.toFixed(2)}</strong></div>
            ${declaraDigital ? `<div class="flex-between"><span>Diferença Caixa:</span><strong>R$ ${diferencaCaixa.toFixed(2)}</strong></div>` : ''}
            <div class="divider"></div>
            <p class="text-center" style="font-size:10px; margin: 12px 0 0 0;">Assinatura Operador: ___________________</p>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // --- CÁLCULOS EM TEMPO REAL ---

  // Modo Detalhado
  const totalSobraAnteriorDetalhado = gradeItens.reduce(
    (acc, item) => acc + (Number(item.qtd_sobra_anterior) || 0),
    0
  );
  const totalEnviadoDetalhado = gradeItens.reduce(
    (acc, item) => acc + (Number(item.qtd_enviada) || 0),
    0
  );
  const totalDisponivelDetalhado = totalSobraAnteriorDetalhado + totalEnviadoDetalhado;
  const totalRetornoDetalhado = gradeItens.reduce(
    (acc, item) => acc + (Number(item.qtd_retorno) || 0),
    0
  );

  // Vendas: Total Disponível - Sobras Declaradas
  const totalVendidosDetalhado = Math.max(0, totalDisponivelDetalhado - totalRetornoDetalhado);

  const faturamentoBrutoDetalhado = gradeItens.reduce((acc, item) => {
    const disp = (Number(item.qtd_sobra_anterior) || 0) + (Number(item.qtd_enviada) || 0);
    const vend = Math.max(0, disp - (Number(item.qtd_retorno) || 0));
    return acc + vend * (Number(item.preco_unitario) || 0);
  }, 0);

  const totalPerdas = perdasList.reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
  const faturamentoLiquidoEsperado = Math.max(0, faturamentoBrutoDetalhado - totalPerdas);

  // Modo Rápido
  const totalVendidosRapido = Math.max(0, qtdEnviadaRapida - qtdRetornoRapida);
  const faturamentoBrutoRapido = totalVendidosRapido * precoMedioRapido;

  // Consolidação
  const totalEnviado = modo === 'detalhado' ? totalEnviadoDetalhado : qtdEnviadaRapida;
  const totalRetorno = modo === 'detalhado' ? totalRetornoDetalhado : qtdRetornoRapida;
  const totalVendidos = modo === 'detalhado' ? totalVendidosDetalhado : totalVendidosRapido;
  const faturamentoTeorico =
    modo === 'detalhado' ? faturamentoLiquidoEsperado : faturamentoBrutoRapido;

  // Auditoria Financeira
  const declaraDigital = (Number(valorPix) || 0) > 0 || (Number(valorCartao) || 0) > 0;
  const valorRecebidoInformado =
    (Number(valorDinheiro) || 0) + (Number(valorPix) || 0) + (Number(valorCartao) || 0);
  const pixCartaoEsperado = Math.max(0, faturamentoTeorico - (Number(valorDinheiro) || 0));
  const diferencaCaixa = declaraDigital ? valorRecebidoInformado - faturamentoTeorico : 0;

  // Manipulação de Grade e Perdas
  const handleAtualizarItemGrade = (
    index: number,
    campo: 'qtd_enviada' | 'qtd_retorno',
    val: number
  ) => {
    const copy = [...gradeItens];
    copy[index][campo] = Math.max(0, val);
    setGradeItens(copy);
  };

  const handleVendeuTudoZerarSobras = () => {
    setGradeItens(
      gradeItens.map((item) => ({
        ...item,
        qtd_retorno: 0,
      }))
    );
    toast({
      title: 'Sobra Zero Aplicada!',
      description: 'Todas as sobras foram preenchidas com 0 (100% vendido).',
      variant: 'info',
    });
  };

  const handleAdicionarPerda = () => {
    if (!novaPerdaDesc.trim() || novaPerdaValor <= 0) {
      toast({
        title: 'Atenção',
        description: 'Informe o motivo e o valor do ajuste.',
        variant: 'warning',
      });
      return;
    }

    setPerdasList([
      ...perdasList,
      {
        id: Math.random().toString(),
        descricao: novaPerdaDesc.trim(),
        valor: novaPerdaValor,
      },
    ]);
    setNovaPerdaDesc('');
    setNovaPerdaValor(0);
  };

  const handleRemoverPerda = (id: string) => {
    setPerdasList(perdasList.filter((p) => p.id !== id));
  };

  const handleSalvarRemessa = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!localId) {
      toast({ title: 'Atenção', description: 'Selecione o PDV.', variant: 'warning' });
      return;
    }

    if (totalEnviado <= 0) {
      toast({
        title: 'Atenção',
        description: 'Informe a quantidade enviada ao PDV.',
        variant: 'warning',
      });
      return;
    }

    setSalvando(true);
    try {
      const payload = {
        organization_id: profile?.organization_id,
        local_id: localId,
        data: dataAcerto,
        turno,
        vendedor_nome: vendedorNome.trim() || null,
        modo_lancamento: modo,
        tipo_fechamento: tipoFechamento,

        // Totais
        qtd_total_enviada: totalEnviado,
        qtd_total_retorno: totalRetorno,
        preco_medio_rapido: modo === 'rapido' ? precoMedioRapido : 0,

        // Romaneio Detalhado
        itens_grade: modo === 'detalhado' ? gradeItens : [],
        ajustes_perdas: perdasList,
        total_descontos_perdas: totalPerdas,

        // Recebimentos
        valor_dinheiro_gaveta: valorDinheiro,
        faturamento_bruto_teorico:
          modo === 'detalhado' ? faturamentoBrutoDetalhado : faturamentoBrutoRapido,
        faturamento_liquido_esperado: faturamentoTeorico,
        pix_cartao_esperado: pixCartaoEsperado,

        valor_pix_declarado: valorPix,
        valor_cartao_declarado: valorCartao,
        diferenca_auditoria: diferencaCaixa,

        status: 'encerrado',
        observacoes: observacoes.trim() || null,
      };

      const { error } = await supabase.from('remessas_cargas_pdv').insert([payload]);
      if (error) throw error;

      toast({
        title: 'Remessa e Fechamento Salvos!',
        description: `Romaneio (${tipoFechamento.toUpperCase()}) gravado com sucesso. Pix/Cartão Esperado: R$ ${pixCartaoEsperado.toFixed(2)}`,
        variant: 'success',
      });

      // Reset
      setGradeItens(
        produtosBase.map((p) => ({
          produto_id: p.id,
          nome: p.nome,
          preco_unitario: p.preco,
          qtd_sobra_anterior: 0,
          qtd_enviada: 0,
          qtd_retorno: 0,
        }))
      );
      setQtdEnviadaRapida(0);
      setQtdRetornoRapida(0);
      setValorDinheiro(0);
      setValorPix(0);
      setValorCartao(0);
      setPerdasList([]);
      setObservacoes('');
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'error' });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl min-w-0 overflow-x-hidden space-y-6 p-2 sm:p-4 md:p-8">
      {/* Header com Toggle de Modo */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text/80">Romaneio de Carga & Fechamento PDV</h1>
          <p className="text-sm text-text/50">
            Caderno Digital: Saída por produto, apuração por sobra e Vendas totais (Pix/Cartão).
          </p>
        </div>

        {/* Toggle Switch */}
        <div className="inline-flex rounded-2xl border border-primary/20 bg-primary/5 p-1">
          <button
            type="button"
            onClick={() => setModo('detalhado')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              modo === 'detalhado'
                ? 'bg-primary text-white shadow-sm'
                : 'text-text/60 hover:text-text/90'
            }`}
          >
            <ListOrdered className="h-4 w-4" /> Modo Romaneio (Por Doce)
          </button>
          <button
            type="button"
            onClick={() => setModo('rapido')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              modo === 'rapido'
                ? 'bg-primary text-white shadow-sm'
                : 'text-text/60 hover:text-text/90'
            }`}
          >
            <Layers className="h-4 w-4" /> Modo Rápido (Volume Global)
          </button>
        </div>
      </div>

      <form onSubmit={handleSalvarRemessa} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Painel Principal (Carga e Grade) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Identificação */}
          <div className="space-y-4 rounded-2xl border border-primary/10 bg-background p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text/60">
              <Store className="h-4 w-4 text-primary" /> Selecione o Ponto de Venda (PDV)
            </h2>

            {/* Grid Seletor por Cards Clicáveis */}
            <PDVSelectorCards
              locais={locais}
              selectedId={localId}
              onSelect={(id) => setLocalId(id)}
              carregando={loading}
            />

            {/* Seletor de Tipo de Registro de Fechamento */}
            <div className="border-t border-primary/10 pt-4">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-text/60">
                Selecione o Tipo de Fechamento do Turno/Dia:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTipoFechamento('parcial')}
                  className={`flex flex-col items-start justify-between rounded-xl p-3 text-left border transition-all ${
                    tipoFechamento === 'parcial'
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-900 dark:text-cyan-200 ring-2 ring-cyan-500/30'
                      : 'border-primary/10 bg-background hover:bg-primary/5 text-text/70'
                  }`}
                >
                  <span className="font-bold text-xs">🔵 Fechamento Parcial</span>
                  <span className="text-[10px] text-text/50 mt-1">
                    Sobra permanece no PDV para amanhã
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setTipoFechamento('semanal')}
                  className={`flex flex-col items-start justify-between rounded-xl p-3 text-left border transition-all ${
                    tipoFechamento === 'semanal'
                      ? 'border-purple-500 bg-purple-500/10 text-purple-900 dark:text-purple-200 ring-2 ring-purple-500/30'
                      : 'border-primary/10 bg-background hover:bg-primary/5 text-text/70'
                  }`}
                >
                  <span className="font-bold text-xs">🟣 Encerramento de Ciclo</span>
                  <span className="text-[10px] text-text/50 mt-1">
                    Contagem física final da semana
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setTipoFechamento('diario')}
                  className={`flex flex-col items-start justify-between rounded-xl p-3 text-left border transition-all ${
                    tipoFechamento === 'diario'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/30'
                      : 'border-primary/10 bg-background hover:bg-primary/5 text-text/70'
                  }`}
                >
                  <span className="font-bold text-xs">🟢 Fechamento Padrão</span>
                  <span className="text-[10px] text-text/50 mt-1">
                    Recolhimento diário obrigatório
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 border-t border-primary/10 pt-4">
              <div>
                <label className="text-xs font-semibold text-text/70">Data</label>
                <input
                  type="date"
                  value={dataAcerto}
                  onChange={(e) => setDataAcerto(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-primary/20 bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="flex items-center gap-1 text-xs font-semibold text-text/70">
                  <Clock className="h-3.5 w-3.5 text-text/50" /> Turno
                </label>
                <select
                  value={turno}
                  onChange={(e) => setTurno(e.target.value as any)}
                  className="mt-1 w-full rounded-xl border border-primary/20 bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="integral">Integral (Dia Todo)</option>
                  <option value="manha">Manhã</option>
                  <option value="tarde">Tarde</option>
                  <option value="noite">Noite</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-1 text-xs font-semibold text-text/70">
                  <User className="h-3.5 w-3.5 text-text/50" /> Atendente / Vendedor
                </label>
                <input
                  type="text"
                  value={vendedorNome}
                  onChange={(e) => setVendedorNome(e.target.value)}
                  placeholder="Ex: Maria"
                  className="mt-1 w-full rounded-xl border border-primary/20 bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Grade de Produtos (Modo Detalhado - Caderno Digital) */}
          {modo === 'detalhado' ? (
            <div className="space-y-4 rounded-2xl border border-primary/10 bg-background p-5 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-primary/10 pb-3">
                <div>
                  <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text/60">
                    <Package className="h-4 w-4 text-primary" /> Romaneio de Carga & Sobras por Doce
                  </h2>
                  <span className="text-[11px] text-text/50">
                    {tipoFechamento === 'parcial'
                      ? '🔵 Sobra em Loja: Produtos não recolhidos permanecem no estoque do PDV.'
                      : tipoFechamento === 'semanal'
                        ? '🟣 Encerramento Semanal: Informe a sobra física final recolhida.'
                        : '🟢 Fechamento Padrão: Digite o retorno físico do dia.'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleVendeuTudoZerarSobras}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition-colors"
                >
                  ⚡ Vendeu Tudo (Sobra Zero)
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-primary/10 bg-primary/5 font-bold uppercase text-text/50">
                    <tr>
                      <th className="p-2.5">Doce / Produto</th>
                      <th className="p-2.5 text-center">Preço Unit</th>
                      <th className="p-2.5 text-center">Sobra Anterior</th>
                      <th className="p-2.5 text-center">Envio Hoje</th>
                      <th className="p-2.5 text-center">Total Disp.</th>
                      <th className="p-2.5 text-center">Sobras (Retorno)</th>
                      <th className="p-2.5 text-right">Vendidos</th>
                      <th className="p-2.5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary/5">
                    {gradeItens.map((item, idx) => {
                      const disp = (item.qtd_sobra_anterior || 0) + (item.qtd_enviada || 0);
                      const vend = Math.max(0, disp - (item.qtd_retorno || 0));
                      const subtotal = vend * item.preco_unitario;

                      return (
                        <tr key={item.produto_id} className="hover:bg-primary/5 transition-colors">
                          <td className="p-2.5 font-bold text-text/80">{item.nome}</td>
                          <td className="p-2.5 text-center font-mono text-text/60">
                            R$ {item.preco_unitario.toFixed(2)}
                          </td>
                          <td className="p-2.5 text-center font-mono text-cyan-600 font-bold bg-cyan-50/30 dark:bg-cyan-950/10">
                            {item.qtd_sobra_anterior || 0} un
                          </td>
                          <td className="p-2.5 text-center">
                            <input
                              type="number"
                              min="0"
                              value={item.qtd_enviada || ''}
                              onChange={(e) =>
                                handleAtualizarItemGrade(idx, 'qtd_enviada', Number(e.target.value))
                              }
                              placeholder="0"
                              className="w-16 rounded-lg border border-primary/20 bg-background px-2 py-1 text-center font-semibold outline-none focus:border-primary"
                            />
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold text-text/80">
                            {disp} un
                          </td>
                          <td className="p-2.5 text-center">
                            <input
                              type="number"
                              min="0"
                              value={item.qtd_retorno || ''}
                              onChange={(e) =>
                                handleAtualizarItemGrade(idx, 'qtd_retorno', Number(e.target.value))
                              }
                              placeholder="0"
                              className="w-16 rounded-lg border border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 px-2 py-1 text-center font-semibold text-amber-700 outline-none focus:border-amber-500"
                            />
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-primary">
                            {vend} un
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-text/80">
                            R$ {subtotal.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Ajustes / Perdas / Cortesias */}
              <div className="border-t border-primary/10 pt-4">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-text/60">
                  Ajustes de Turno (Perdas, Avarias, Brindes ou Descontos)
                </h3>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={novaPerdaDesc}
                    onChange={(e) => setNovaPerdaDesc(e.target.value)}
                    placeholder="Motivo (ex: 1 brownie caiu no chão)"
                    className="flex-1 rounded-xl border border-primary/20 bg-background px-3 py-1.5 text-xs outline-none focus:border-primary"
                  />
                  <BRLCurrencyInput
                    value={novaPerdaValor}
                    onChange={(val) => setNovaPerdaValor(val)}
                    placeholder="R$ 0,00"
                    className="w-28 rounded-xl border border-primary/20 bg-background px-3 py-1.5 text-xs outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={handleAdicionarPerda}
                    className="flex items-center justify-center gap-1 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20"
                  >
                    <Plus className="h-4 w-4" /> Add Ajuste
                  </button>
                </div>

                {perdasList.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {perdasList.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-lg bg-rose-50/60 dark:bg-rose-950/20 px-3 py-1.5 text-xs text-rose-700 dark:text-rose-400"
                      >
                        <span>{p.descricao}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold">-R$ {p.valor.toFixed(2)}</span>
                          <button type="button" onClick={() => handleRemoverPerda(p.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-rose-500 hover:text-rose-700" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Modo Rápido (Volume Global) */
            <div className="space-y-4 rounded-2xl border border-primary/10 bg-background p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text/60">
                <Layers className="h-4 w-4 text-primary" /> Lançamento por Volume Global
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-xs font-semibold text-text/70">Qtd Enviada Total</label>
                  <input
                    type="number"
                    min="0"
                    value={qtdEnviadaRapida || ''}
                    onChange={(e) => setQtdEnviadaRapida(Number(e.target.value))}
                    placeholder="Ex: 150"
                    className="mt-1 w-full rounded-xl border border-primary/20 bg-background px-3 py-2 text-base font-semibold outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-text/70">Qtd Retorno (Sobras)</label>
                  <input
                    type="number"
                    min="0"
                    value={qtdRetornoRapida || ''}
                    onChange={(e) => setQtdRetornoRapida(Number(e.target.value))}
                    placeholder="Ex: 15"
                    className="mt-1 w-full rounded-xl border border-primary/20 bg-background px-3 py-2 text-base font-semibold outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-text/70">Preço Médio Estimado</label>
                  <BRLCurrencyInput
                    value={precoMedioRapido}
                    onChange={(val) => setPrecoMedioRapido(val)}
                    placeholder="R$ 8,00"
                    className="mt-1 w-full rounded-xl border border-primary/20 bg-background px-3 py-2 text-base font-semibold outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Painel Lateral Financeiro (Conferência de Gaveta & Metas Digitais) */}
        <div className="space-y-4 rounded-2xl border border-primary/10 bg-background p-5 shadow-sm h-fit">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text/60">
            <DollarSign className="h-4 w-4 text-primary" /> Apuração Financeira do PDV
          </h2>

          <div className="space-y-3">
            <div>
              <label className="flex items-center justify-between text-xs font-bold text-text/70">
                <span className="flex items-center gap-1">
                  <Banknote className="h-3.5 w-3.5 text-emerald-600" /> Dinheiro Físico (Gaveta)
                </span>
              </label>
              <BRLCurrencyInput
                value={valorDinheiro}
                onChange={(val) => setValorDinheiro(val)}
                placeholder="R$ 0,00"
                className="mt-1 w-full rounded-xl border border-emerald-300 bg-emerald-50/30 dark:bg-emerald-950/20 px-3 py-2 text-base font-mono font-bold text-emerald-700 outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-text/40">
                Dinheiro recolhido no envelope/gaveta
              </span>
            </div>

            <div className="border-t border-primary/10 pt-3">
              <label className="text-xs font-semibold text-text/70">Pix Declarado (Opcional)</label>
              <BRLCurrencyInput
                value={valorPix}
                onChange={(val) => setValorPix(val)}
                placeholder="R$ 0,00"
                className="mt-1 w-full rounded-xl border border-primary/20 bg-background px-3 py-1.5 text-xs font-mono outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text/70">
                Cartão / POS Declarado (Opcional)
              </label>
              <BRLCurrencyInput
                value={valorCartao}
                onChange={(val) => setValorCartao(val)}
                placeholder="R$ 0,00"
                className="mt-1 w-full rounded-xl border border-primary/20 bg-background px-3 py-1.5 text-xs font-mono outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text/70">Observações do Turno</label>
              <textarea
                rows={2}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex: Troca de turno rápida"
                className="mt-1 w-full rounded-xl border border-primary/20 bg-background px-3 py-1.5 text-xs outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Card Resumo Teórico & Compromisso Digital */}
          <div className="space-y-2 border-t border-primary/10 pt-4 text-xs">
            <div className="flex justify-between text-text/60">
              <span>Unidades Vendidas:</span>
              <span className="font-mono font-bold text-primary">{totalVendidos} un</span>
            </div>
            <div className="flex justify-between text-text/60">
              <span>Faturamento Bruto Teórico:</span>
              <span className="font-mono font-bold text-text/80">
                R${' '}
                {(modo === 'detalhado'
                  ? faturamentoBrutoDetalhado
                  : faturamentoBrutoRapido
                ).toFixed(2)}
              </span>
            </div>
            {modo === 'detalhado' && totalPerdas > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Total Perdas/Ajustes:</span>
                <span className="font-mono font-bold">-R$ {totalPerdas.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-text/90">
              <span>Receita Líquida Exigida:</span>
              <span className="font-mono text-sm text-primary">
                R$ {faturamentoTeorico.toFixed(2)}
              </span>
            </div>

            {/* Destaque do Compromisso Digital Pix/Cartão */}
            <div className="mt-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/30 p-3 border border-cyan-200 dark:border-cyan-800">
              <span className="text-[11px] font-bold text-cyan-800 dark:text-cyan-300">
                🎯 Total Vendas do PDV (Pix + Cartão):
              </span>
              <p className="mt-1 font-mono text-xl font-black text-cyan-700 dark:text-cyan-300">
                R$ {pixCartaoEsperado.toFixed(2)}
              </p>
              <span className="text-[10px] text-cyan-600/80 dark:text-cyan-400/70">
                Cálculo: (Receita Exigida - Dinheiro Físico na Gaveta)
              </span>
            </div>

            {declaraDigital && (
              <div
                className={`mt-2 flex items-center justify-between rounded-xl p-3 font-bold ${
                  diferencaCaixa < -1
                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 border border-emerald-200'
                }`}
              >
                <span>{diferencaCaixa < -1 ? 'Furo no Caixa:' : 'Diferença:'}</span>
                <span className="font-mono">R$ {diferencaCaixa.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={salvando || totalEnviado <= 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-sm transition-all hover:opacity-95 active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              {salvando ? 'Gravando...' : 'Salvar Romaneio'}
            </button>

            <button
              type="button"
              onClick={handleGerarComprovantePDF}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 py-2.5 text-xs font-bold text-primary hover:bg-primary/10 transition-all"
            >
              <Printer className="h-4 w-4" /> Gerar Recibo / PDF do Romaneio
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
