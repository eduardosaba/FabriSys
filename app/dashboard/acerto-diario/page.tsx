'use client';

import { useState, useEffect } from 'react';
import BRLCurrencyInput from '@/components/ui/shared/BRLCurrencyInput';
import { getLocalDateISOString } from '@/lib/utils';

import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/useToast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';
import { PDVSelectorCards } from '@/components/ui/shared/PDVSelectorCards';
import confetti from 'canvas-confetti';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Banknote,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  Download,
  Edit3,
  FileText,
  Filter,
  HelpCircle,
  Layers,
  ListOrdered,
  MinusCircle,
  Package,
  Plus,
  PlusCircle,
  Printer,
  QrCode,
  RefreshCw,
  SlidersHorizontal,
  Store,
  Trash2,
  User,
  X,
} from 'lucide-react';

interface LocalPDV {
  id: string;
  nome: string;
  tipo?: string;
  logo_url?: string;
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
  qtd_enviada_anterior?: number;
  qtd_enviada_nova?: number;
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
  const confirmDialog = useConfirm();

  const [locais, setLocais] = useState<LocalPDV[]>([]);
  const [produtosBase, setProdutosBase] = useState<ProdutoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [modoEdicaoEnvio, setModoEdicaoEnvio] = useState<boolean>(false);

  // Modal de Sucesso no Centro da Tela
  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    detalhes?: {
      pdv: string;
      data: string;
      totalEnviado?: number;
      totalVendidos?: number;
      valorDinheiro?: number;
      pixCartaoEsperado?: number;
    };
  }>({
    isOpen: false,
    title: '',
    description: '',
  });

  // Modo de Operação: 'detalhado' (Romaneio / Substitui Caderno) ou 'rapido' (Volume Global)
  const [modo, setModo] = useState<'detalhado' | 'rapido'>('detalhado');

  // Etapa do Lançamento: 'envio' (1. Envio de Carga), 'fechamento' (2. Sobras & Financeiro) ou 'tudo' (Modo Unificado)
  const [etapaAcerto, setEtapaAcerto] = useState<'envio' | 'fechamento' | 'tudo'>('envio');

  // Status do Fechamento do PDV Selecionado: 'aberto' (pendente de encerramento), 'encerrado' (já concluído), 'sem_carga', 'sobra_acumulada', 'conferido', 'auditado'
  const [statusFechamentoPDV, setStatusFechamentoPDV] = useState<
    'aberto' | 'encerrado' | 'sem_carga' | 'sobra_acumulada' | 'conferido' | 'auditado' | string
  >('sem_carga');

  // Tipo de Fechamento: 'diario' (Padrão), 'parcial' (Sobra Acumulada no PDV) ou 'semanal' (Encerramento do Ciclo)
  const [tipoFechamento, setTipoFechamento] = useState<'diario' | 'parcial' | 'semanal'>('parcial');
  const [mostrarOpcoesFechamento, setMostrarOpcoesFechamento] = useState<boolean>(false);

  // Identificação da Carga/Turno
  const [localId, setLocalId] = useState<string>('');
  const [dataAcerto, setDataAcerto] = useState<string>(() => getLocalDateISOString());
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
  const [mostrarPixCartao, setMostrarPixCartao] = useState<boolean>(false);
  const [mostrarAjudaFechamento, setMostrarAjudaFechamento] = useState<boolean>(false);

  // Estados da Aba 3 - Ver Tudo Unificado
  const [dataInicioTudo, setDataInicioTudo] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return getLocalDateISOString(d);
  });
  const [dataFimTudo, setDataFimTudo] = useState<string>(() => getLocalDateISOString());
  const [turnoTudo, setTurnoTudo] = useState<string>('todos');
  const [pdvTudo, setPdvTudo] = useState<string>('todos');
  const [historicoTudo, setHistoricoTudo] = useState<any[]>([]);
  const [loadingTudo, setLoadingTudo] = useState<boolean>(false);

  // Turnos em Aberto ou com Apenas Dinheiro Informado (Aguardando Fechamento de Sobras / Pix e Cartão)
  const [turnosEmAberto, setTurnosEmAberto] = useState<any[]>([]);

  useEffect(() => {
    if (!profile?.organization_id) return;
    async function carregarTurnosEmAberto() {
      try {
        const { data } = await supabase
          .from('remessas_cargas_pdv')
          .select('*, locais:local_id(nome)')
          .eq('organization_id', profile.organization_id)
          .in('status', ['aberto', 'dinheiro_informado', 'sobras_informadas'])
          .order('data', { ascending: false })
          .order('created_at', { ascending: false });

        if (data) {
          setTurnosEmAberto(data);
        }
      } catch (err) {
        console.error('Erro ao carregar turnos em aberto:', err);
      }
    }
    carregarTurnosEmAberto();
  }, [profile?.organization_id, statusFechamentoPDV]);

  const handleSelecionarTurnoEmAberto = (item: any) => {
    if (item.local_id) setLocalId(item.local_id);
    if (item.data) setDataAcerto(item.data);
    if (item.turno) setTurno(item.turno);
    if (item.vendedor_nome) setVendedorNome(item.vendedor_nome);
    if (item.valor_dinheiro_gaveta !== undefined)
      setValorDinheiro(Number(item.valor_dinheiro_gaveta) || 0);
    if (item.valor_pix_declarado !== undefined) setValorPix(Number(item.valor_pix_declarado) || 0);
    if (item.valor_cartao_declarado !== undefined)
      setValorCartao(Number(item.valor_cartao_declarado) || 0);
    if (item.observacoes) setObservacoes(item.observacoes);

    if (item.status === 'dinheiro_informado') {
      setMostrarPixCartao(true);
    }
    setEtapaAcerto('fechamento');
  };

  // Effect para buscar o histórico unificado na Aba 3
  useEffect(() => {
    if (etapaAcerto !== 'tudo') return;

    async function carregarHistoricoTudo() {
      setLoadingTudo(true);
      try {
        let query = supabase
          .from('remessas_cargas_pdv')
          .select('*, locais:local_id(nome)')
          .order('data', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(2000);

        if (profile?.organization_id) {
          query = query.eq('organization_id', profile.organization_id);
        }

        if (dataInicioTudo && dataInicioTudo.trim() !== '') {
          query = query.gte('data', dataInicioTudo);
        }

        if (dataFimTudo && dataFimTudo.trim() !== '') {
          query = query.lte('data', dataFimTudo);
        }

        if (turnoTudo && turnoTudo !== 'todos') {
          query = query.eq('turno', turnoTudo);
        }

        if (pdvTudo && pdvTudo !== 'todos') {
          query = query.eq('local_id', pdvTudo);
        }

        const resMain = await query;
        let data = resMain.data;
        const error = resMain.error;

        // Fallback: Se filtrar por organização não retornar dados (ex: remessas registradas sem org_id), buscar sem o filtro de organização
        if ((!data || data.length === 0) && profile?.organization_id) {
          let fallbackQuery = supabase
            .from('remessas_cargas_pdv')
            .select('*, locais:local_id(nome)')
            .order('data', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(2000);

          if (dataInicioTudo && dataInicioTudo.trim() !== '') {
            fallbackQuery = fallbackQuery.gte('data', dataInicioTudo);
          }

          if (dataFimTudo && dataFimTudo.trim() !== '') {
            fallbackQuery = fallbackQuery.lte('data', dataFimTudo);
          }

          if (turnoTudo && turnoTudo !== 'todos') {
            fallbackQuery = fallbackQuery.eq('turno', turnoTudo);
          }

          if (pdvTudo && pdvTudo !== 'todos') {
            fallbackQuery = fallbackQuery.eq('local_id', pdvTudo);
          }

          const fallbackRes = await fallbackQuery;
          if (fallbackRes.data && fallbackRes.data.length > 0) {
            data = fallbackRes.data;
          }
        }

        if (error && (!data || data.length === 0)) throw error;

        // Exibir histórico unificado preservando todos os lançamentos por turno
        setHistoricoTudo(data || []);
      } catch (err: any) {
        console.error('Erro ao carregar histórico unificado:', err);
      } finally {
        setLoadingTudo(false);
      }
    }

    carregarHistoricoTudo();
  }, [etapaAcerto, dataInicioTudo, dataFimTudo, turnoTudo, pdvTudo, profile?.organization_id]);

  // Totais Agregados para a Aba 3
  const totEnviadoTudo = historicoTudo.reduce(
    (acc, r) => acc + (Number(r.qtd_total_enviada) || 0),
    0
  );
  const totSobraTudo = historicoTudo.reduce(
    (acc, r) => acc + (Number(r.qtd_total_retorno) || 0),
    0
  );
  const totVendidosTudo = historicoTudo.reduce(
    (acc, r) =>
      acc + Math.max(0, (Number(r.qtd_total_enviada) || 0) - (Number(r.qtd_total_retorno) || 0)),
    0
  );
  const totDinheiroTudo = historicoTudo.reduce(
    (acc, r) => acc + (Number(r.valor_dinheiro_gaveta) || 0),
    0
  );
  const totCartaoTudo = historicoTudo.reduce(
    (acc, r) => acc + (Number(r.valor_cartao_declarado) || 0),
    0
  );
  const totPixTudo = historicoTudo.reduce(
    (acc, r) => acc + (Number(r.valor_pix_declarado) || 0),
    0
  );
  const totFaturamentoTudo = historicoTudo.reduce((acc, r) => {
    const liq = Number(r.faturamento_liquido_esperado) || Number(r.faturamento_bruto_teorico) || 0;
    const meiopag =
      (Number(r.valor_dinheiro_gaveta) || 0) +
      (Number(r.valor_cartao_declarado) || 0) +
      (Number(r.valor_pix_declarado) || 0);
    return acc + (liq > 0 ? liq : meiopag);
  }, 0);

  // Estados para Edição e Exclusão na Aba 3
  const [editandoItem, setEditandoItem] = useState<any | null>(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState<boolean>(false);
  const [editData, setEditData] = useState<string>('');
  const [editTurno, setEditTurno] = useState<string>('integral');
  const [editVendedor, setEditVendedor] = useState<string>('');
  const [editQtdEnviada, setEditQtdEnviada] = useState<number>(0);
  const [editQtdRetorno, setEditQtdRetorno] = useState<number>(0);
  const [editValorDinheiro, setEditValorDinheiro] = useState<number>(0);
  const [editValorPix, setEditValorPix] = useState<number>(0);
  const [editValorCartao, setEditValorCartao] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<string>('encerrado');

  function abrirModalEdicao(item: any) {
    setEditandoItem(item);
    setEditData(item.data || getLocalDateISOString());
    setEditTurno(item.turno || 'integral');
    setEditVendedor(item.vendedor_nome || '');
    setEditQtdEnviada(Number(item.qtd_total_enviada) || 0);
    setEditQtdRetorno(Number(item.qtd_total_retorno) || 0);
    setEditValorDinheiro(Number(item.valor_dinheiro_gaveta) || 0);
    setEditValorPix(Number(item.valor_pix_declarado) || 0);
    setEditValorCartao(Number(item.valor_cartao_declarado) || 0);
    setEditStatus(item.status || 'encerrado');
  }

  async function handleSalvarEdicao() {
    if (!editandoItem) return;
    setSalvandoEdicao(true);
    try {
      const somaValores = editValorDinheiro + editValorPix + editValorCartao;
      const faturEsperado =
        Number(editandoItem.faturamento_liquido_esperado) > 0
          ? Number(editandoItem.faturamento_liquido_esperado)
          : somaValores;

      const payload: any = {
        data: editData,
        turno: editTurno,
        vendedor_nome: editVendedor.trim() || null,
        qtd_total_enviada: editQtdEnviada,
        qtd_total_retorno: editQtdRetorno,
        valor_dinheiro_gaveta: editValorDinheiro,
        valor_pix_declarado: editValorPix,
        valor_cartao_declarado: editValorCartao,
        faturamento_liquido_esperado: faturEsperado,
        status: editStatus,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('remessas_cargas_pdv')
        .update(payload)
        .eq('id', editandoItem.id);

      if (error) throw error;

      toast({
        title: 'Lançamento Atualizado!',
        description: 'As alterações foram salvas com sucesso.',
        variant: 'success',
      });

      setHistoricoTudo((prev) =>
        prev.map((r) => (r.id === editandoItem.id ? { ...r, ...payload } : r))
      );

      setEditandoItem(null);
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar alterações',
        description: err.message,
        variant: 'error',
      });
    } finally {
      setSalvandoEdicao(false);
    }
  }

  async function handleExcluirRemessa(item: any) {
    const pdvNome = item.locais?.nome || locais.find((l) => l.id === item.local_id)?.nome || 'PDV';
    const dataFormatada = item.data ? item.data.split('-').reverse().join('/') : '';

    const confirmou = await confirmDialog.confirm({
      title: 'Excluir Lançamento?',
      message: `Tem certeza que deseja excluir o lançamento de ${dataFormatada} (${item.turno}) do PDV "${pdvNome}"? Esta ação não poderá ser desfeita.`,
      confirmText: 'Excluir Lançamento',
      cancelText: 'Cancelar',
      variant: 'danger',
    });

    if (!confirmou) return;

    try {
      const { error } = await supabase.from('remessas_cargas_pdv').delete().eq('id', item.id);

      if (error) throw error;

      toast({
        title: 'Lançamento Excluído',
        description: `O lançamento do PDV "${pdvNome}" foi removido com sucesso.`,
        variant: 'success',
      });

      setHistoricoTudo((prev) => prev.filter((r) => r.id !== item.id));
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir lançamento',
        description: err.message,
        variant: 'error',
      });
    }
  }

  // Carregar PDVs e Produtos
  useEffect(() => {
    async function carregarDadosIniciais() {
      setLoading(true);
      try {
        // Carregar PDVs (apenas pontos de venda, excluindo a Fábrica)
        let queryLocais = supabase.from('locais').select('id, nome, tipo, logo_url, ordem');
        if (profile?.organization_id) {
          queryLocais = queryLocais.eq('organization_id', profile.organization_id);
        }
        const { data: dataLocaisRaw, error: errorLocais } = await queryLocais
          .order('ordem', { ascending: true })
          .order('nome');
        let dataLocais = dataLocaisRaw;

        if (errorLocais && errorLocais.message?.includes('ordem')) {
          const res = await queryLocais.order('nome');
          dataLocais = res.data;
        }

        // Se a busca por organization_id não retornar nenhum local, busca sem filtro para garantir exibição
        if (!dataLocais || dataLocais.length === 0) {
          let { data: fallbackLocais } = await supabase
            .from('locais')
            .select('id, nome, tipo, logo_url, ordem')
            .order('ordem', { ascending: true })
            .order('nome');
          if (!fallbackLocais) {
            const resFallback = await supabase
              .from('locais')
              .select('id, nome, tipo, logo_url')
              .order('nome');
            fallbackLocais = resFallback.data;
          }
          dataLocais = fallbackLocais ?? [];
        }

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

        // Carregar Produtos Finais cadastrados na confeitaria (Apenas Ativos)
        let queryProds = supabase
          .from('produtos_finais')
          .select('id, nome, preco_venda, ativo')
          .neq('ativo', false);
        if (profile?.organization_id) {
          queryProds = queryProds.eq('organization_id', profile.organization_id);
        }
        let { data: dataProds } = await queryProds.order('nome');

        // Se a busca por organization_id não retornar nenhum produto, busca sem o filtro de organização
        if (!dataProds || dataProds.length === 0) {
          const { data: fallbackProds } = await supabase
            .from('produtos_finais')
            .select('id, nome, preco_venda, ativo')
            .neq('ativo', false)
            .order('nome');
          if (fallbackProds && fallbackProds.length > 0) {
            dataProds = fallbackProds;
          }
        }

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

  // Carregar Sobra Anterior e Remessas Acumuladas do PDV Selecionado
  useEffect(() => {
    async function carregarSobraAnteriorOuRemessaAberta() {
      if (!profile?.organization_id || !localId || produtosBase.length === 0) return;

      try {
        // Helper para determinar se um fechamento é estritamente anterior ao turno/data selecionado
        const isTurnoAnterior = (
          fData: string,
          fTurno: string,
          targetData: string,
          targetTurno: string
        ): boolean => {
          if (fData < targetData) return true;
          if (fData > targetData) return false;

          const order: Record<string, number> = {
            manha: 1,
            tarde: 2,
            noite: 3,
            integral: 4,
          };

          const fOrder = order[fTurno || 'integral'] || 1;
          const targetOrder = order[targetTurno || 'integral'] || 4;

          if (targetTurno === 'integral' || targetTurno === 'manha') {
            return false;
          }

          return fOrder < targetOrder;
        };

        // 1. Buscar a sobra do último fechamento (encerrado ou parcial) anterior ou do mesmo dia em turno passado
        const { data: fechamentoAnteriorList } = await supabase
          .from('remessas_cargas_pdv')
          .select('id, itens_grade, data, status, created_at, turno')
          .eq('organization_id', profile.organization_id)
          .eq('local_id', localId)
          .lte('data', dataAcerto)
          .in('status', [
            'encerrado',
            'auditado',
            'conferido',
            'parcial',
            'sobras_informadas',
            'dinheiro_informado',
          ])
          .order('data', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(20);

        // Filtrar apenas lançamentos que ocorreram antes do turno/data atual
        const fechamentosValidosAnteriores = (fechamentoAnteriorList || []).filter((f) =>
          isTurnoAnterior(f.data, f.turno || 'integral', dataAcerto, turno)
        );

        // Identificar o último fechamento concluído que possua contagem de sobras (retorno)
        const ultimoFechamentoComSobra =
          fechamentosValidosAnteriores.find((f) => {
            if (!Array.isArray(f.itens_grade)) return false;
            return f.itens_grade.some((it: any) => Number(it.qtd_retorno || 0) > 0);
          }) || fechamentosValidosAnteriores[0];

        const sobrasAnterioresMap: Record<string, number> = {};
        if (ultimoFechamentoComSobra && Array.isArray(ultimoFechamentoComSobra.itens_grade)) {
          ultimoFechamentoComSobra.itens_grade.forEach((it: any) => {
            if (it.produto_id) {
              sobrasAnterioresMap[it.produto_id] = Number(it.qtd_retorno) || 0;
            }
          });
        }

        // 2. Buscar lançamentos da data selecionada para o PDV
        const { data: remessasNaDataAll } = await supabase
          .from('remessas_cargas_pdv')
          .select('*')
          .eq('organization_id', profile.organization_id)
          .eq('local_id', localId)
          .eq('data', dataAcerto)
          .order('created_at', { ascending: true });

        // Se o turno for específico (manhã, tarde, noite), filtrar para o turno; se for 'integral', somar todos os turnos do dia
        const remessasNaData = (remessasNaDataAll || []).filter((r) => {
          if (turno === 'integral' || !turno) return true;
          return (r.turno || 'integral') === turno;
        });

        if (remessasNaData && remessasNaData.length > 0) {
          const ultimaRemessa = remessasNaData[remessasNaData.length - 1];
          const remessaFechada = remessasNaData
            .slice()
            .reverse()
            .find((r) =>
              [
                'encerrado',
                'dinheiro_informado',
                'sobras_informadas',
                'parcial',
                'conferido',
                'auditado',
              ].includes(r.status)
            );

          setStatusFechamentoPDV(
            remessaFechada ? remessaFechada.status : ultimaRemessa.status || 'aberto'
          );
          if (ultimaRemessa.vendedor_nome && !vendedorNome)
            setVendedorNome(ultimaRemessa.vendedor_nome);
          if (ultimaRemessa.modo_lancamento) setModo(ultimaRemessa.modo_lancamento);
          if (ultimaRemessa.tipo_fechamento) setTipoFechamento(ultimaRemessa.tipo_fechamento);

          // Consolidar envios por produto das remessas filtradas e manter sobras de retorno registradas
          const enviosNoDiaMap: Record<string, number> = {};
          const sobrasRetornoNaDataMap: Record<string, number> = {};
          const sobrasAnterioresSalvasMap: Record<string, number> = {};

          remessasNaData.forEach((remessa) => {
            if (Array.isArray(remessa.itens_grade)) {
              remessa.itens_grade.forEach((it: any) => {
                if (it.produto_id) {
                  enviosNoDiaMap[it.produto_id] =
                    (enviosNoDiaMap[it.produto_id] || 0) + (Number(it.qtd_enviada) || 0);
                  if (it.qtd_retorno !== undefined && it.qtd_retorno !== null) {
                    sobrasRetornoNaDataMap[it.produto_id] = Number(it.qtd_retorno) || 0;
                  }
                  if (
                    it.qtd_sobra_anterior !== undefined &&
                    it.qtd_sobra_anterior !== null &&
                    Number(it.qtd_sobra_anterior) > 0
                  ) {
                    sobrasAnterioresSalvasMap[it.produto_id] = Number(it.qtd_sobra_anterior);
                  }
                }
              });
            }
          });

          setGradeItens(
            produtosBase.map((p) => {
              const sobraAnterior =
                sobrasAnterioresMap[p.id] !== undefined
                  ? sobrasAnterioresMap[p.id]
                  : sobrasAnterioresSalvasMap[p.id] || 0;
              const enviadaHoje = enviosNoDiaMap[p.id] || 0;
              const retornoHoje = sobrasRetornoNaDataMap[p.id] || 0;
              return {
                produto_id: p.id,
                nome: p.nome,
                preco_unitario: p.preco,
                qtd_sobra_anterior: sobraAnterior,
                qtd_enviada: enviadaHoje,
                qtd_enviada_anterior: enviadaHoje,
                qtd_enviada_nova: 0,
                qtd_retorno: retornoHoje,
              };
            })
          );
          setModoEdicaoEnvio(false);

          const totalEnviadoDiaRapido = remessasNaData.reduce(
            (acc, r) => acc + (Number(r.qtd_total_enviada) || 0),
            0
          );
          if (totalEnviadoDiaRapido > 0) setQtdEnviadaRapida(totalEnviadoDiaRapido);
        } else {
          // Nenhuma carga lançada para o turno selecionado: carregar produtos com a sobra anterior do último fechamento
          setStatusFechamentoPDV('sem_carga');
          setModoEdicaoEnvio(false);
          setGradeItens(
            produtosBase.map((p) => ({
              produto_id: p.id,
              nome: p.nome,
              preco_unitario: p.preco,
              qtd_sobra_anterior: sobrasAnterioresMap[p.id] || 0,
              qtd_enviada: 0,
              qtd_enviada_anterior: 0,
              qtd_enviada_nova: 0,
              qtd_retorno: 0,
            }))
          );
          setQtdEnviadaRapida(0);
          setQtdRetornoRapida(0);
        }
      } catch (err) {
        console.error('Erro ao carregar dados do romaneio:', err);
        setStatusFechamentoPDV('sem_carga');
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

    carregarSobraAnteriorOuRemessaAberta();
  }, [profile?.organization_id, localId, dataAcerto, turno, produtosBase]);

  const handleGerarComprovantePDF = () => {
    const localNome = locais.find((l) => l.id === localId)?.nome || 'PDV';
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const nomeEmpresa =
      profile?.organizations?.nome ||
      profile?.organization_name ||
      profile?.empresa_nome ||
      'Larissa Saba - Doces Gourmet';
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
            <div class="flex-between"><span>Pix/Cartão Esperado:</span><strong>R$ ${pixCartaoEsperado.toFixed(2)}</strong></div>
            ${
              declaraDigital
                ? `
              <div class="flex-between"><span>Pix Declarado:</span><strong>R$ ${(Number(valorPix) || 0).toFixed(2)}</strong></div>
              <div class="flex-between"><span>Cartão Declarado:</span><strong>R$ ${(Number(valorCartao) || 0).toFixed(2)}</strong></div>
              <div class="flex-between"><span>Diferença Digital:</span><strong>R$ ${diferencaDigital.toFixed(2)}</strong></div>
              <div class="flex-between"><span>Diferença Geral Caixa:</span><strong>R$ ${diferencaCaixa.toFixed(2)}</strong></div>
            `
                : ''
            }
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
  // Modo Detalhado
  const totalSobraAnteriorDetalhado = gradeItens.reduce(
    (acc, item) => acc + (Number(item.qtd_sobra_anterior) || 0),
    0
  );
  const totalEnviadoAnteriorDetalhado = gradeItens.reduce(
    (acc, item) => acc + (Number(item.qtd_enviada_anterior) || 0),
    0
  );
  const totalEnviadoNovoDetalhado = gradeItens.reduce(
    (acc, item) => acc + (Number(item.qtd_enviada_nova) || 0),
    0
  );

  const totalEnviadoDetalhado =
    totalEnviadoAnteriorDetalhado > 0 && !modoEdicaoEnvio
      ? totalEnviadoAnteriorDetalhado + totalEnviadoNovoDetalhado
      : gradeItens.reduce((acc, item) => acc + (Number(item.qtd_enviada) || 0), 0);

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
  const totalDigitalDeclarado = (Number(valorPix) || 0) + (Number(valorCartao) || 0);
  const declaraDigital = totalDigitalDeclarado > 0;
  const valorRecebidoInformado = (Number(valorDinheiro) || 0) + totalDigitalDeclarado;
  const pixCartaoEsperado = Math.max(0, faturamentoTeorico - (Number(valorDinheiro) || 0));
  const diferencaDigital = totalDigitalDeclarado - pixCartaoEsperado;
  const diferencaCaixa = declaraDigital ? valorRecebidoInformado - faturamentoTeorico : 0;

  // Status de bloqueio de edição do fechamento
  const isFechamentoBloqueado =
    etapaAcerto === 'fechamento' &&
    statusFechamentoPDV !== 'aberto' &&
    statusFechamentoPDV !== 'sem_carga' &&
    statusFechamentoPDV !== 'sobra_acumulada';

  // Manipulação de Grade e Perdas
  const handleAtualizarItemGrade = (
    indexOrId: number | string,
    campo: 'qtd_enviada' | 'qtd_enviada_nova' | 'qtd_retorno',
    val: number
  ) => {
    if (typeof indexOrId === 'string') {
      setGradeItens((prev) =>
        prev.map((item) => {
          if (item.produto_id !== indexOrId) return item;
          const updatedVal = Math.max(0, val);
          if (campo === 'qtd_enviada_nova') {
            return {
              ...item,
              qtd_enviada_nova: updatedVal,
              qtd_enviada: (item.qtd_enviada_anterior || 0) + updatedVal,
            };
          }
          if (campo === 'qtd_enviada') {
            return {
              ...item,
              qtd_enviada: updatedVal,
              qtd_enviada_nova: Math.max(0, updatedVal - (item.qtd_enviada_anterior || 0)),
            };
          }
          return { ...item, [campo]: updatedVal };
        })
      );
    } else {
      setGradeItens((prev) => {
        const copy = [...prev];
        if (copy[indexOrId]) {
          const item = copy[indexOrId];
          const updatedVal = Math.max(0, val);
          if (campo === 'qtd_enviada_nova') {
            copy[indexOrId] = {
              ...item,
              qtd_enviada_nova: updatedVal,
              qtd_enviada: (item.qtd_enviada_anterior || 0) + updatedVal,
            };
          } else if (campo === 'qtd_enviada') {
            copy[indexOrId] = {
              ...item,
              qtd_enviada: updatedVal,
              qtd_enviada_nova: Math.max(0, updatedVal - (item.qtd_enviada_anterior || 0)),
            };
          } else {
            copy[indexOrId] = { ...item, [campo]: updatedVal };
          }
        }
        return copy;
      });
    }
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

  const handleSalvarRemessa = async (
    e?: React.FormEvent,
    targetStatusOverride?: 'dinheiro_informado' | 'encerrado'
  ) => {
    if (e) e.preventDefault();

    if (!localId) {
      toast({ title: 'Atenção', description: 'Selecione o PDV.', variant: 'warning' });
      return;
    }

    const statusAlvoFechamento = targetStatusOverride || 'encerrado';

    // Validação e Modal de Romaneio Detalhado para a Aba 1 (Envio de Carga)
    if (etapaAcerto === 'envio') {
      if (totalEnviado <= 0) {
        toast({
          title: 'Nenhum Dado Preenchido',
          description:
            'Informe a quantidade enviada de pelo menos um produto antes de registrar o envio.',
          variant: 'warning',
        });
        return;
      }

      const pdvNome = locais.find((l) => l.id === localId)?.nome || 'PDV';
      const itensEnviados = gradeItens.filter((i) => i.qtd_enviada > 0);

      const confirmou = await confirmDialog.confirm({
        title: `Confirmar Envio de Produtos - ${pdvNome}`,
        message: (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-lg text-xs border border-slate-200">
              <div>
                <span className="font-semibold text-slate-700">Data / Turno:</span> {dataAcerto} (
                {turno.toUpperCase()})
              </div>
              {vendedorNome.trim() ? (
                <div>
                  <span className="font-semibold text-slate-700">Atendente:</span> {vendedorNome}
                </div>
              ) : (
                <div className="text-amber-700 font-bold">
                  <span>Atendente:</span> <span className="underline">Não informado</span>
                </div>
              )}
              <div>
                <span className="font-semibold text-primary">Total Enviado:</span> {totalEnviado} un
              </div>
            </div>

            {!vendedorNome.trim() && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>Atenção: O nome do Atendente / Vendedor não foi preenchido.</span>
              </div>
            )}

            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Romaneio Detalhado dos Produtos Enviados:
            </p>

            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs bg-white">
              {modo === 'detalhado' ? (
                itensEnviados.length > 0 ? (
                  itensEnviados.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center p-2 hover:bg-slate-50"
                    >
                      <span className="font-medium text-slate-800 truncate pr-2">{item.nome}</span>
                      <span className="font-bold text-primary shrink-0 bg-primary/10 px-2 py-0.5 rounded">
                        {item.qtd_enviada} un
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-center text-slate-400">
                    Nenhum produto com quantidade enviada.
                  </div>
                )
              ) : (
                <div className="p-3 flex justify-between items-center">
                  <span className="font-medium text-slate-800">
                    Produtos Enviados (Modo Rápido)
                  </span>
                  <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                    {totalEnviado} un
                  </span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-500 italic">
              Confira os itens acima. Ao confirmar, os produtos serão enviados para o PDV.
            </p>
          </div>
        ),
        confirmText: 'Confirmar Envio',
        cancelText: 'Revisar Quantidades',
        variant: 'info',
      });

      if (!confirmou) return;
    } else {
      // Validação e Modal de Resumo Detalhado para a Aba 2 (Sobras & Fechamento Financeiro)
      const pdvNome = locais.find((l) => l.id === localId)?.nome || 'PDV';
      const itensComMovimentacao = gradeItens.filter(
        (i) => (Number(i.qtd_sobra_anterior) || 0) + (Number(i.qtd_enviada) || 0) > 0
      );

      const isParcialDinheiro = statusAlvoFechamento === 'dinheiro_informado';

      const confirmou = await confirmDialog.confirm({
        title: isParcialDinheiro
          ? `Salvar Fechamento Parcial (Sobras + Valores) - ${pdvNome}`
          : `Confirmar Encerramento Completo do Turno - ${pdvNome}`,
        message: (
          <div className="space-y-3 text-left">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-lg text-xs border border-slate-200">
              <div>
                <span className="font-semibold text-slate-700">Data / Turno:</span> {dataAcerto} (
                {turno.toUpperCase()})
              </div>
              {vendedorNome.trim() ? (
                <div>
                  <span className="font-semibold text-slate-700">Atendente:</span> {vendedorNome}
                </div>
              ) : (
                <div className="text-amber-700 font-bold">
                  <span>Atendente:</span> <span className="underline">Não informado</span>
                </div>
              )}
              <div>
                <span className="font-semibold text-slate-700">Status a Gravar:</span>{' '}
                <span className="font-bold text-amber-700 uppercase">
                  {isParcialDinheiro ? 'Dinheiro Informado' : 'Encerrado'}
                </span>
              </div>
            </div>

            {isParcialDinheiro && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  Sobras físicas e dinheiro recebido serão gravados. Os valores de Pix e Cartão
                  poderão ser preenchidos posteriormente no Fechamento Noturno.
                </span>
              </div>
            )}

            {!vendedorNome.trim() && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>Atenção: O nome do Atendente / Vendedor não foi preenchido.</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 p-2.5 bg-primary/5 rounded-lg border border-primary/10 text-xs text-center">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Total Disponível
                </span>
                <span className="font-bold text-slate-800">{totalDisponivelDetalhado} un</span>
              </div>
              <div>
                <span className="text-[10px] text-amber-700 uppercase font-semibold block">
                  Sobra em Loja
                </span>
                <span className="font-bold text-amber-700">{totalRetorno} un</span>
              </div>
              <div>
                <span className="text-[10px] text-primary uppercase font-semibold block">
                  Vendidos
                </span>
                <span className="font-bold text-primary">{totalVendidos} un</span>
              </div>
            </div>

            {modo === 'detalhado' && itensComMovimentacao.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Resumo dos Produtos e Sobras em Loja:
                </p>
                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs bg-white">
                  {itensComMovimentacao.map((item, idx) => {
                    const disp =
                      (Number(item.qtd_sobra_anterior) || 0) + (Number(item.qtd_enviada) || 0);
                    const sob = Number(item.qtd_retorno) || 0;
                    const vend = Math.max(0, disp - sob);
                    return (
                      <div
                        key={idx}
                        className="flex justify-between items-center p-2 hover:bg-slate-50"
                      >
                        <span className="font-medium text-slate-800 truncate pr-2">
                          {item.nome}
                        </span>
                        <div className="flex items-center gap-3 text-[11px] shrink-0">
                          <span className="text-slate-500">Disp: {disp}</span>
                          <span className="text-amber-700 font-semibold">Sobra: {sob}</span>
                          <span className="font-bold text-primary">Vend: {vend} un</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="p-3 bg-slate-900 text-white rounded-xl text-xs space-y-1.5 shadow-sm">
              <div className="flex justify-between text-slate-300">
                <span>Receita Exigida Teórica:</span>
                <span className="font-mono font-bold text-white">
                  R$ {faturamentoTeorico.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Dinheiro Físico na Gaveta:</span>
                <span className="font-mono font-bold text-emerald-400">
                  R$ {(Number(valorDinheiro) || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-slate-300 border-t border-slate-700 pt-1">
                <span>Vendas Pix / Cartão Esperadas:</span>
                <span className="font-mono font-bold text-cyan-300">
                  R$ {pixCartaoEsperado.toFixed(2)}
                </span>
              </div>
              {declaraDigital && (
                <>
                  <div className="flex justify-between text-slate-300">
                    <span>Vendas Pix / Cartão Declaradas:</span>
                    <span className="font-mono font-bold text-cyan-200">
                      R$ {totalDigitalDeclarado.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 pl-2">
                    • Pix: R$ {(Number(valorPix) || 0).toFixed(2)} | Cartão: R${' '}
                    {(Number(valorCartao) || 0).toFixed(2)}
                  </div>
                  <div
                    className={`flex justify-between font-bold pt-1 border-t border-slate-700 ${
                      diferencaDigital < -0.05
                        ? 'text-rose-400'
                        : diferencaDigital > 0.05
                          ? 'text-emerald-400'
                          : 'text-cyan-300'
                    }`}
                  >
                    <span>Diferença Digital (Pix/Cartão):</span>
                    <span className="font-mono">
                      {diferencaDigital > 0 ? '+' : ''}R$ {diferencaDigital.toFixed(2)}
                    </span>
                  </div>
                </>
              )}
              {declaraDigital && diferencaCaixa !== 0 && (
                <div
                  className={`flex justify-between font-bold pt-1 border-t border-slate-700 ${diferencaCaixa < 0 ? 'text-rose-400' : 'text-emerald-400'}`}
                >
                  <span>
                    {diferencaCaixa < 0 ? 'Furo de Caixa Total:' : 'Sobra no Caixa Total:'}
                  </span>
                  <span className="font-mono">R$ {diferencaCaixa.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        ),
        confirmText: isParcialDinheiro ? 'Salvar Sobras e valores' : 'Confirmar e Encerrar Turno',
        cancelText: 'Revisar Fechamento',
        variant: 'info',
      });

      if (!confirmou) return;
    }

    setSalvando(true);
    try {
      const gradeItensSalvar = gradeItens.map((item) => {
        const finalEnviada =
          modoEdicaoEnvio || (Number(item.qtd_enviada_anterior) || 0) === 0
            ? Number(item.qtd_enviada) || 0
            : (Number(item.qtd_enviada_anterior) || 0) + (Number(item.qtd_enviada_nova) || 0);
        return {
          produto_id: item.produto_id,
          nome: item.nome,
          preco_unitario: item.preco_unitario,
          qtd_sobra_anterior: item.qtd_sobra_anterior || 0,
          qtd_enviada: finalEnviada,
          qtd_enviada_anterior: finalEnviada,
          qtd_enviada_nova: 0,
          qtd_retorno: item.qtd_retorno || 0,
        };
      });

      const totalEnviadoCalculado =
        modo === 'detalhado'
          ? gradeItensSalvar.reduce((acc, i) => acc + i.qtd_enviada, 0)
          : qtdEnviadaRapida;

      const payload = {
        organization_id: profile?.organization_id,
        local_id: localId,
        data: dataAcerto,
        turno,
        vendedor_nome: vendedorNome.trim() || null,
        modo_lancamento: modo,
        tipo_fechamento: tipoFechamento,

        // Totais
        qtd_total_enviada: totalEnviadoCalculado,
        qtd_total_retorno: totalRetorno,
        preco_medio_rapido: modo === 'rapido' ? precoMedioRapido : 0,

        // Romaneio Detalhado
        itens_grade: modo === 'detalhado' ? gradeItensSalvar : [],
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

        status: etapaAcerto === 'envio' ? 'aberto' : statusAlvoFechamento,
        observacoes: observacoes.trim() || null,
      };

      // Verificar se já existe lançamento registrado para o mesmo PDV, Data E TURNO (evitando duplicidade)
      const { data: registrosExistentes } = await supabase
        .from('remessas_cargas_pdv')
        .select(
          'id, organization_id, status, qtd_total_enviada, valor_dinheiro_gaveta, valor_pix_declarado, valor_cartao_declarado'
        )
        .eq('local_id', localId)
        .eq('data', dataAcerto)
        .eq('turno', turno)
        .order('created_at', { ascending: true });

      // Dar preferência ao registro com organization_id caso exista
      let registroExistente = null;
      if (registrosExistentes && registrosExistentes.length > 0) {
        const comOrg = registrosExistentes.find(
          (r) => r.organization_id === profile?.organization_id
        );
        registroExistente = comOrg || registrosExistentes[0];
      }

      let error;
      if (registroExistente) {
        if (etapaAcerto === 'envio') {
          // === ENVIO (Aba 1): Atualizar APENAS dados de envio no registro existente ===
          const envioPayload: any = {
            organization_id: profile?.organization_id || registroExistente.organization_id,
            local_id: localId,
            data: dataAcerto,
            turno,
            vendedor_nome: vendedorNome.trim() || null,
            modo_lancamento: modo,

            // Dados de envio
            qtd_total_enviada: totalEnviadoCalculado,
            itens_grade: modo === 'detalhado' ? gradeItensSalvar : [],
            preco_medio_rapido: modo === 'rapido' ? precoMedioRapido : 0,

            // Manter status atual se já teve fechamento; só marca 'aberto' se ainda era 'aberto'
            status: registroExistente.status === 'aberto' ? 'aberto' : registroExistente.status,
            updated_at: new Date().toISOString(),
          };

          const res = await supabase
            .from('remessas_cargas_pdv')
            .update(envioPayload)
            .eq('id', registroExistente.id);
          error = res.error;
        } else {
          // === FECHAMENTO (Aba 2): Atualizar tudo (sobras + financeiro + status) ===
          const fechamentoPayload: any = {
            ...payload,
            updated_at: new Date().toISOString(),
          };

          const res = await supabase
            .from('remessas_cargas_pdv')
            .update(fechamentoPayload)
            .eq('id', registroExistente.id);
          error = res.error;

          if (
            error &&
            (error.message?.includes('tipo_fechamento') ||
              error.details?.includes('tipo_fechamento'))
          ) {
            const fallbackPayload = { ...fechamentoPayload };
            delete fallbackPayload.tipo_fechamento;
            const resFallback = await supabase
              .from('remessas_cargas_pdv')
              .update(fallbackPayload)
              .eq('id', registroExistente.id);
            error = resFallback.error;
          }
        }

        // Se houver duplicatas do mesmo turno/data/PDV, sincronizar status em todas para evitar pendência fantasma
        if (registrosExistentes && registrosExistentes.length > 1) {
          const outrosIds = registrosExistentes
            .filter((r) => r.id !== registroExistente.id)
            .map((r) => r.id);
          if (outrosIds.length > 0) {
            await supabase
              .from('remessas_cargas_pdv')
              .update({
                status: etapaAcerto === 'envio' ? 'aberto' : statusAlvoFechamento,
                updated_at: new Date().toISOString(),
              })
              .in('id', outrosIds);
          }
        }
      } else {
        // Cria um novo registro apenas se realmente não existir nenhum para o turno/data/PDV
        const res = await supabase.from('remessas_cargas_pdv').insert([payload]);
        error = res.error;

        if (
          error &&
          (error.message?.includes('tipo_fechamento') || error.details?.includes('tipo_fechamento'))
        ) {
          const fallbackPayload = { ...payload };
          delete (fallbackPayload as any).tipo_fechamento;
          const resFallback = await supabase.from('remessas_cargas_pdv').insert([fallbackPayload]);
          error = resFallback.error;
        }
      }

      if (error) throw error;

      const pdvNome = locais.find((l) => l.id === localId)?.nome || 'PDV';

      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        console.warn('Confetti exception:', e);
      }

      if (etapaAcerto === 'envio') {
        setStatusFechamentoPDV('aberto');
        toast({
          title: 'Envio de Produtos Salvo!',
          description: `Envio de ${totalEnviado} produtos registrado com sucesso para o PDV "${pdvNome}".`,
          variant: 'success',
        });
        setSuccessModal({
          isOpen: true,
          title: '🎉 Carga / Envio Salvo com Sucesso!',
          description: `O envio de ${totalEnviado} produtos para o PDV "${pdvNome}" foi registrado com sucesso no sistema.`,
          detalhes: {
            pdv: pdvNome,
            data: dataAcerto,
            totalEnviado: totalEnviado,
          },
        });
      } else {
        setStatusFechamentoPDV(statusAlvoFechamento);
        toast({
          title:
            statusAlvoFechamento === 'dinheiro_informado'
              ? 'Fechamento Parcial Salvo!'
              : 'Fechamento Encerrado!',
          description: `Fechamento (${tipoFechamento.toUpperCase()}) do PDV "${pdvNome}" gravado com sucesso. Pix/Cartão Esperado: R$ ${pixCartaoEsperado.toFixed(2)}`,
          variant: 'success',
        });
        setSuccessModal({
          isOpen: true,
          title:
            statusAlvoFechamento === 'dinheiro_informado'
              ? '🎉 Fechamento Parcial Salvo com Sucesso!'
              : '🎉 Fechamento Encerrado com Sucesso!',
          description: `O fechamento (${tipoFechamento.toUpperCase()}) do PDV "${pdvNome}" foi gravado com sucesso no sistema.`,
          detalhes: {
            pdv: pdvNome,
            data: dataAcerto,
            totalVendidos: totalVendidos,
            valorDinheiro: Number(valorDinheiro) || 0,
            pixCartaoEsperado: pixCartaoEsperado,
          },
        });
      }

      // Manter os itens salvos na grade para exibir na tela travados com os dados gravados
      setGradeItens(gradeItensSalvar);
      setModoEdicaoEnvio(false);
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text/80">
          Lançamento de Romaneio, Produtos, Financeiro & Sobras
        </h1>
        <p className="text-sm text-text/50">
          Caderno Digital: Saída por produto, apuração por sobra e Vendas totais (Pix/Cartão).
        </p>
      </div>

      {/* Card de Resumo Diário Compacto no Topo */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-primary/20 bg-background p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-text/50">
              Dinheiro Recolhido
            </span>
            <p className="mt-0.5 font-mono text-lg font-black text-emerald-600 dark:text-emerald-400">
              R${' '}
              {turnosEmAberto
                .reduce((acc, r) => acc + Number(r.valor_dinheiro_gaveta || 0), 0)
                .toFixed(2)}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <Banknote className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-amber-300/60 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
              Pix / Cartão Pendentes
            </span>
            <p className="mt-0.5 font-mono text-lg font-black text-amber-700 dark:text-amber-300">
              {turnosEmAberto.filter((t) => t.status === 'dinheiro_informado').length} turno(s)
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            <QrCode className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-primary/20 bg-background p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-text/50">
              Turnos sem Sobras
            </span>
            <p className="mt-0.5 font-mono text-lg font-black text-rose-600 dark:text-rose-400">
              {turnosEmAberto.filter((t) => t.status === 'aberto').length} turno(s)
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-primary/20 bg-background p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-text/50">
              Data / Turno Selecionado
            </span>
            <p className="mt-0.5 font-mono text-sm font-black text-primary">
              {dataAcerto.split('-').reverse().join('/')} ({turno.toUpperCase()})
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Calendar className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Banner / Cards de Turnos em Aberto (Aguardando Fechamento de Sobras) */}
      {turnosEmAberto.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/90 dark:border-amber-800 dark:bg-amber-950/40 p-4 shadow-sm space-y-3 animate-fade-down">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200 dark:border-amber-800/60 pb-2.5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-200">
                Atenção: {turnosEmAberto.length} Turno(s) / Carga(s) em Aberto Aguardando Fechamento
              </h3>
            </div>
            <span className="text-[11px] text-amber-800/80 dark:text-amber-300/80 font-medium">
              Clique no card para ir direto para a digitação de sobras (Aba 2)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {turnosEmAberto.map((item) => {
              const pdvNome = item.locais?.nome || 'PDV';
              const dataFmt = item.data ? item.data.split('-').reverse().join('/') : '-';
              const turnoFmt = item.turno ? item.turno.toUpperCase() : 'INTEGRAL';
              const enviados = Number(item.qtd_total_enviada) || 0;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelecionarTurnoEmAberto(item)}
                  className="flex flex-col justify-between rounded-xl border border-amber-300/80 bg-white dark:bg-slate-900 p-3 text-left shadow-2xs hover:border-amber-500 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2 w-full">
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1.5 truncate">
                      <Store className="h-3.5 w-3.5 text-primary shrink-0" /> {pdvNome}
                    </span>
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                      Aberto
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 w-full">
                    <div className="flex justify-between">
                      <span>Data / Turno:</span>
                      <strong className="font-mono">
                        {dataFmt} ({turnoFmt})
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Qtd Enviada:</span>
                      <strong className="font-mono text-primary font-black">{enviados} un</strong>
                    </div>
                    {item.vendedor_nome && (
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Atendente:</span>
                        <span className="truncate">{item.vendedor_nome}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-amber-700 dark:text-amber-400 group-hover:text-primary transition-colors w-full">
                    <span>Fechar Turno Agora</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Seletor de Etapas (Abas: 1. Envio de Carga | 2. Sobras & Financeiro | Ver Tudo) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 p-1.5 shadow-sm">
        <button
          type="button"
          onClick={() => setEtapaAcerto('envio')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            etapaAcerto === 'envio'
              ? 'bg-primary text-white shadow ring-2 ring-primary/30'
              : 'text-text/70 hover:bg-primary/10'
          }`}
        >
          <Package className="h-4 w-4" /> 1. Envio de Produtos para o PDV
        </button>

        <button
          type="button"
          onClick={() => setEtapaAcerto('fechamento')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            etapaAcerto === 'fechamento'
              ? 'bg-primary text-white shadow ring-2 ring-primary/30'
              : 'text-text/70 hover:bg-primary/10'
          }`}
        >
          <CheckCircle2 className="h-4 w-4" /> 2. Sobras & Fechamento Financeiro
        </button>

        <button
          type="button"
          onClick={() => setEtapaAcerto('tudo')}
          className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            etapaAcerto === 'tudo'
              ? 'bg-primary text-white shadow ring-2 ring-primary/30'
              : 'text-text/70 hover:bg-primary/10'
          }`}
        >
          <Layers className="h-4 w-4" /> Ver Tudo (Unificado)
        </button>
      </div>

      {/* Aba 3: Relatório Consolidação & Tabela Unificada */}
      {etapaAcerto === 'tudo' && (
        <div className="space-y-6 animate-fade-up">
          {/* Painel de Filtros Gerais */}
          <div className="rounded-2xl border border-primary/20 bg-background p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-primary/10 pb-3">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-primary">
                  <Filter className="h-4 w-4 text-primary" /> Filtros Gerais do Relatório
                </h2>
                <p className="text-xs text-text/60">
                  Filtre as remessas e fechamentos por período (data inicial/final), turno e ponto
                  de venda.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const today = getLocalDateISOString();
                    setDataInicioTudo(today);
                    setDataFimTudo(today);
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition-colors"
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    const d7 = new Date(today);
                    d7.setDate(today.getDate() - 7);
                    setDataInicioTudo(getLocalDateISOString(d7));
                    setDataFimTudo(getLocalDateISOString(today));
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition-colors"
                >
                  Últimos 7 dias
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    const dMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                    setDataInicioTudo(getLocalDateISOString(dMonth));
                    setDataFimTudo(getLocalDateISOString(today));
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition-colors"
                >
                  Este Mês
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDataInicioTudo('');
                    setDataFimTudo('');
                    setTurnoTudo('todos');
                    setPdvTudo('todos');
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-primary/20 bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                >
                  Ver Todo Histórico
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Data Inicial */}
              <div>
                <label className="text-xs font-bold text-text/70 block mb-1">Data Inicial</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-text/40 pointer-events-none" />
                  <input
                    type="date"
                    value={dataInicioTudo}
                    onChange={(e) => setDataInicioTudo(e.target.value)}
                    className="w-full rounded-xl border border-primary/20 bg-background pl-9 pr-3 py-2 text-xs font-semibold outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Data Final */}
              <div>
                <label className="text-xs font-bold text-text/70 block mb-1">Data Final</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-text/40 pointer-events-none" />
                  <input
                    type="date"
                    value={dataFimTudo}
                    onChange={(e) => setDataFimTudo(e.target.value)}
                    className="w-full rounded-xl border border-primary/20 bg-background pl-9 pr-3 py-2 text-xs font-semibold outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Turno */}
              <div>
                <label className="text-xs font-bold text-text/70 block mb-1">Turno</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-2.5 h-4 w-4 text-text/40 pointer-events-none" />
                  <select
                    value={turnoTudo}
                    onChange={(e) => setTurnoTudo(e.target.value)}
                    className="w-full rounded-xl border border-primary/20 bg-background pl-9 pr-3 py-2 text-xs font-semibold outline-none focus:border-primary"
                  >
                    <option value="todos">Todos os Turnos</option>
                    <option value="integral">Integral</option>
                    <option value="manha">Manhã</option>
                    <option value="tarde">Tarde</option>
                    <option value="noite">Noite</option>
                  </select>
                </div>
              </div>

              {/* PDV / Loja */}
              <div>
                <label className="text-xs font-bold text-text/70 block mb-1">
                  Ponto de Venda (PDV)
                </label>
                <div className="relative">
                  <Store className="absolute left-3 top-2.5 h-4 w-4 text-text/40 pointer-events-none" />
                  <select
                    value={pdvTudo}
                    onChange={(e) => setPdvTudo(e.target.value)}
                    className="w-full rounded-xl border border-primary/20 bg-background pl-9 pr-3 py-2 text-xs font-semibold outline-none focus:border-primary"
                  >
                    <option value="todos">Todos os PDVs / Lojas</option>
                    {locais.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Grid de KPIs do Período Filtrado */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {/* 1. Enviado */}
            <div className="rounded-xl border border-primary/15 bg-background p-3 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text/50 block truncate">
                Total Enviado
              </span>
              <p className="mt-1 font-mono text-lg font-black text-primary">{totEnviadoTudo} un</p>
              <span className="text-[10px] text-text/40 block truncate">Remessas no Período</span>
            </div>

            {/* 2. Sobras */}
            <div className="rounded-xl border border-amber-300/40 bg-amber-50/40 dark:bg-amber-950/20 p-3 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block truncate">
                Sobras em Loja
              </span>
              <p className="mt-1 font-mono text-lg font-black text-amber-700 dark:text-amber-300">
                {totSobraTudo} un
              </p>
              <span className="text-[10px] text-amber-600/70 block truncate">Retorno Físico</span>
            </div>

            {/* 3. Vendas */}
            <div className="rounded-xl border border-emerald-300/40 bg-emerald-50/40 dark:bg-emerald-950/20 p-3 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block truncate">
                Vendas Totais
              </span>
              <p className="mt-1 font-mono text-lg font-black text-emerald-700 dark:text-emerald-300">
                {totVendidosTudo} un
              </p>
              <span className="text-[10px] text-emerald-600/70 block truncate">
                Unidades Vendidas
              </span>
            </div>

            {/* 4. Dinheiro */}
            <div className="rounded-xl border border-emerald-300/40 bg-emerald-50/40 dark:bg-emerald-950/20 p-3 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block truncate">
                💵 Dinheiro
              </span>
              <p className="mt-1 font-mono text-lg font-black text-emerald-700 dark:text-emerald-300">
                R$ {totDinheiroTudo.toFixed(2)}
              </p>
              <span className="text-[10px] text-emerald-600/70 block truncate">Total Gaveta</span>
            </div>

            {/* 5. Cartão */}
            <div className="rounded-xl border border-cyan-300/40 bg-cyan-50/40 dark:bg-cyan-950/20 p-3 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-800 dark:text-cyan-300 block truncate">
                💳 Cartão
              </span>
              <p className="mt-1 font-mono text-lg font-black text-cyan-700 dark:text-cyan-300">
                R$ {totCartaoTudo.toFixed(2)}
              </p>
              <span className="text-[10px] text-cyan-600/70 block truncate">Débito / Crédito</span>
            </div>

            {/* 6. Pix */}
            <div className="rounded-xl border border-purple-300/40 bg-purple-50/40 dark:bg-purple-950/20 p-3 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300 block truncate">
                📱 Pix
              </span>
              <p className="mt-1 font-mono text-lg font-black text-purple-700 dark:text-purple-300">
                R$ {totPixTudo.toFixed(2)}
              </p>
              <span className="text-[10px] text-purple-600/70 block truncate">
                Transferências Pix
              </span>
            </div>

            {/* 7. Total Faturamento */}
            <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary block truncate">
                Faturamento Total
              </span>
              <p className="mt-1 font-mono text-lg font-black text-primary">
                R$ {totFaturamentoTudo.toFixed(2)}
              </p>
              <span className="text-[10px] text-primary/70 block truncate">Líquido Acumulado</span>
            </div>
          </div>

          {/* Tabela Completa Consolidada */}
          <div className="rounded-2xl border border-primary/20 bg-background overflow-hidden shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-primary/10 bg-primary/5 gap-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-2">
                <Layers className="h-4 w-4" /> Tabela Completa de Romaneios e Fechamentos (
                {historicoTudo.length} registros)
              </h3>
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                <span className="text-text/50 uppercase tracking-wider text-[10px]">Legenda:</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300">
                  🟢 Encerrado
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full uppercase bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300 border border-cyan-300">
                  🔵 Fechamento Parcial
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full uppercase bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300">
                  🟠 Em Aberto
                </span>
                {loadingTudo && (
                  <span className="flex items-center gap-1 text-xs text-primary animate-pulse font-bold ml-2">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-primary/15 bg-primary/10 text-[11px] font-black uppercase text-primary tracking-wider">
                    <th className="p-2.5">Data / Turno</th>
                    <th className="p-2.5">PDV / Loja</th>
                    <th className="p-2.5 text-center">Enviado</th>
                    <th className="p-2.5 text-center">Sobra</th>
                    <th className="p-2.5 text-center">Vendas</th>
                    <th className="p-2.5 text-right">Dinheiro</th>
                    <th className="p-2.5 text-right">Cartão</th>
                    <th className="p-2.5 text-right">Pix</th>
                    <th className="p-2.5 text-right">Total</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingTudo ? (
                    <tr>
                      <td
                        colSpan={11}
                        className="p-8 text-center text-text/50 text-xs font-semibold"
                      >
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                        Carregando lançamentos unificados...
                      </td>
                    </tr>
                  ) : historicoTudo.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-text/50 text-xs">
                        Nenhum fechamento ou romaneio encontrado no período selecionado.
                      </td>
                    </tr>
                  ) : (
                    historicoTudo.map((item) => {
                      const enviada = Number(item.qtd_total_enviada) || 0;
                      const sobra = Number(item.qtd_total_retorno) || 0;
                      const vendas = Math.max(0, enviada - sobra);
                      const din = Number(item.valor_dinheiro_gaveta) || 0;
                      const car = Number(item.valor_cartao_declarado) || 0;
                      const pix = Number(item.valor_pix_declarado) || 0;
                      const liq =
                        Number(item.faturamento_liquido_esperado) ||
                        Number(item.faturamento_bruto_teorico) ||
                        0;
                      const totRow = liq > 0 ? liq : din + car + pix;
                      const pdvNome =
                        item.locais?.nome ||
                        locais.find((l) => l.id === item.local_id)?.nome ||
                        'PDV';
                      const dataFormatada = item.data
                        ? item.data.split('-').reverse().join('/')
                        : '-';
                      const turnoFormatado =
                        item.turno === 'integral'
                          ? 'Integral'
                          : item.turno === 'manha'
                            ? 'Manhã'
                            : item.turno === 'tarde'
                              ? 'Tarde'
                              : item.turno === 'noite'
                                ? 'Noite'
                                : item.turno || '-';

                      return (
                        <tr
                          key={item.id}
                          className="border-b border-primary/5 hover:bg-primary/5 text-xs transition-colors"
                        >
                          <td className="p-2.5 font-semibold text-text/80 whitespace-nowrap">
                            {dataFormatada}{' '}
                            <span className="text-text/40 text-[10px] font-normal">
                              ({turnoFormatado})
                            </span>
                          </td>
                          <td className="p-2.5 font-bold text-primary whitespace-nowrap">
                            {pdvNome}
                          </td>
                          <td className="p-2.5 font-mono font-bold text-center text-slate-800 dark:text-slate-200">
                            {enviada}
                          </td>
                          <td className="p-2.5 font-mono font-bold text-center text-amber-600 dark:text-amber-400">
                            {sobra}
                          </td>
                          <td className="p-2.5 font-mono font-bold text-center text-emerald-600 dark:text-emerald-400">
                            {vendas}
                          </td>
                          <td className="p-2.5 font-mono text-right text-emerald-700 dark:text-emerald-300">
                            R$ {din.toFixed(2)}
                          </td>
                          <td className="p-2.5 font-mono text-right text-cyan-700 dark:text-cyan-300">
                            R$ {car.toFixed(2)}
                          </td>
                          <td className="p-2.5 font-mono text-right text-purple-700 dark:text-purple-300">
                            R$ {pix.toFixed(2)}
                          </td>
                          <td className="p-2.5 font-mono font-black text-right text-primary">
                            R$ {totRow.toFixed(2)}
                          </td>
                          <td className="p-2.5 text-center">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                item.status === 'encerrado' ||
                                item.status === 'auditado' ||
                                item.status === 'conferido'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300'
                                  : item.status === 'dinheiro_informado' ||
                                      item.status === 'sobras_informadas' ||
                                      item.status === 'parcial'
                                    ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300 border border-cyan-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300'
                              }`}
                            >
                              {item.status === 'encerrado'
                                ? 'Encerrado'
                                : item.status === 'auditado'
                                  ? 'Auditado'
                                  : item.status === 'conferido'
                                    ? 'Conferido'
                                    : item.status === 'dinheiro_informado' ||
                                        item.status === 'sobras_informadas' ||
                                        item.status === 'parcial'
                                      ? 'Fechamento Parcial'
                                      : 'Em Aberto'}
                            </span>
                          </td>
                          <td className="p-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => abrirModalEdicao(item)}
                                title="Editar Lançamento"
                                className="p-1.5 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/20 text-primary transition-colors"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExcluirRemessa(item)}
                                title="Excluir Lançamento"
                                className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                <tfoot className="bg-primary/10 border-t-2 border-primary/20 text-xs font-bold">
                  <tr>
                    <td
                      colSpan={2}
                      className="p-2.5 text-right uppercase tracking-wider text-primary"
                    >
                      Totais do Período:
                    </td>
                    <td className="p-3 font-mono text-center font-black text-slate-800 dark:text-slate-100">
                      {totEnviadoTudo}
                    </td>
                    <td className="p-3 font-mono text-center font-black text-amber-700 dark:text-amber-300">
                      {totSobraTudo}
                    </td>
                    <td className="p-3 font-mono text-center font-black text-emerald-700 dark:text-emerald-300">
                      {totVendidosTudo}
                    </td>
                    <td className="p-3 font-mono text-right font-black text-emerald-700 dark:text-emerald-300">
                      R$ {totDinheiroTudo.toFixed(2)}
                    </td>
                    <td className="p-3 font-mono text-right font-black text-cyan-700 dark:text-cyan-300">
                      R$ {totCartaoTudo.toFixed(2)}
                    </td>
                    <td className="p-3 font-mono text-right font-black text-purple-700 dark:text-purple-300">
                      R$ {totPixTudo.toFixed(2)}
                    </td>
                    <td className="p-3 font-mono text-right font-black text-primary text-sm">
                      R$ {totFaturamentoTudo.toFixed(2)}
                    </td>
                    <td className="p-3"></td>
                    <td className="p-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Legenda de Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border-t border-primary/10 bg-primary/5 text-xs">
              <span className="font-bold text-text/70 uppercase tracking-wider text-[11px] flex items-center gap-1.5 shrink-0">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Legenda de Status:
              </span>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300">
                    Aberto
                  </span>
                  <span className="text-text/60 text-[11px]">
                    Carga enviada ao PDV (pendente de encerramento)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300">
                    Encerrado
                  </span>
                  <span className="text-text/60 text-[11px]">
                    Fechamento de turno e financeiro concluído
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300 border border-cyan-300">
                    Auditado
                  </span>
                  <span className="text-text/60 text-[11px]">Conferido e validado pela gestão</span>
                </div>
              </div>
            </div>
          </div>

          {/* Modal de Edição de Lançamento */}
          {editandoItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
              <div className="w-full max-w-lg rounded-2xl border border-primary/20 bg-background p-6 shadow-xl space-y-4 animate-scale-up">
                <div className="flex items-center justify-between border-b border-primary/10 pb-3">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-primary flex items-center gap-2">
                    <Edit3 className="h-4 w-4" /> Editar Lançamento (
                    {editandoItem.locais?.nome || 'PDV'})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setEditandoItem(null)}
                    className="rounded-lg p-1 text-text/40 hover:bg-primary/10 hover:text-text transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-bold text-text/70 block mb-1">Data</label>
                    <input
                      type="date"
                      value={editData}
                      onChange={(e) => setEditData(e.target.value)}
                      className="w-full rounded-xl border border-primary/20 bg-background px-3 py-2 font-semibold outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-text/70 block mb-1">Turno</label>
                    <select
                      value={editTurno}
                      onChange={(e) => setEditTurno(e.target.value)}
                      className="w-full rounded-xl border border-primary/20 bg-background px-3 py-2 font-semibold outline-none focus:border-primary"
                    >
                      <option value="integral">Integral</option>
                      <option value="manha">Manhã</option>
                      <option value="tarde">Tarde</option>
                      <option value="noite">Noite</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-bold text-text/70 block mb-1">
                      Nome do Vendedor / Atendente
                    </label>
                    <input
                      type="text"
                      value={editVendedor}
                      onChange={(e) => setEditVendedor(e.target.value)}
                      placeholder="Ex: Maria"
                      className="w-full rounded-xl border border-primary/20 bg-background px-3 py-2 font-semibold outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-text/70 block mb-1">Qtd Enviada</label>
                    <input
                      type="number"
                      min={0}
                      value={editQtdEnviada}
                      onChange={(e) => setEditQtdEnviada(Number(e.target.value) || 0)}
                      className="w-full rounded-xl border border-primary/20 bg-background px-3 py-2 font-mono font-bold outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-text/70 block mb-1">Qtd Sobra (Retorno)</label>
                    <input
                      type="number"
                      min={0}
                      value={editQtdRetorno}
                      onChange={(e) => setEditQtdRetorno(Number(e.target.value) || 0)}
                      className="w-full rounded-xl border border-primary/20 bg-background px-3 py-2 font-mono font-bold outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-emerald-700 dark:text-emerald-400 block mb-1">
                      💵 Dinheiro Gaveta (R$)
                    </label>
                    <BRLCurrencyInput
                      value={editValorDinheiro}
                      onChange={(val) => setEditValorDinheiro(val)}
                      className="w-full rounded-xl border border-primary/20 bg-background px-3 py-2 font-mono font-bold text-emerald-700 dark:text-emerald-300 outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-cyan-700 dark:text-cyan-400 block mb-1">
                      💳 Cartão Declarado (R$)
                    </label>
                    <BRLCurrencyInput
                      value={editValorCartao}
                      onChange={(val) => setEditValorCartao(val)}
                      className="w-full rounded-xl border border-primary/20 bg-background px-3 py-2 font-mono font-bold text-cyan-700 dark:text-cyan-300 outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-purple-700 dark:text-purple-400 block mb-1">
                      📱 Pix Declarado (R$)
                    </label>
                    <BRLCurrencyInput
                      value={editValorPix}
                      onChange={(val) => setEditValorPix(val)}
                      className="w-full rounded-xl border border-primary/20 bg-background px-3 py-2 font-mono font-bold text-purple-700 dark:text-purple-300 outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-text/70 block mb-1">Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full rounded-xl border border-primary/20 bg-background px-3 py-2 font-semibold outline-none focus:border-primary"
                    >
                      <option value="aberto">Aberto (Pendente)</option>
                      <option value="encerrado">Encerrado</option>
                      <option value="auditado">Auditado</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-primary/10 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditandoItem(null)}
                    disabled={salvandoEdicao}
                    className="px-4 py-2 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 text-xs font-bold text-text/70 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSalvarEdicao}
                    disabled={salvandoEdicao}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary/95 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50"
                  >
                    {salvandoEdicao ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Salvando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Salvar Alterações
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {etapaAcerto !== 'tudo' && (
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

              {/* Alerta de Status do Fechamento na Aba 2 */}
              {etapaAcerto === 'fechamento' && statusFechamentoPDV === 'sobra_acumulada' && (
                <div className="rounded-xl border border-cyan-300 bg-cyan-50 dark:bg-cyan-950/30 p-4 space-y-2 animate-fade-up">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-600 text-white font-bold shadow-sm shrink-0">
                      <Package size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-bold text-cyan-900 dark:text-cyan-200 truncate uppercase tracking-wider">
                        🔵 Fechamento com Sobras Acumuladas ({totalSobraAnteriorDetalhado} un)
                      </h3>
                      <p className="text-xs text-cyan-800 dark:text-cyan-300 leading-snug">
                        Existe um saldo de <strong>{totalSobraAnteriorDetalhado} unidades</strong>{' '}
                        de sobra em loja do fechamento anterior. Você pode contabilizar e fechar
                        estas sobras abaixo ou registrar nova carga na Aba 1.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEtapaAcerto('envio')}
                      className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs rounded-lg shadow-xs transition-colors shrink-0"
                    >
                      <Package size={14} /> Novo Envio (Aba 1)
                    </button>
                  </div>
                </div>
              )}

              {etapaAcerto === 'fechamento' && statusFechamentoPDV === 'encerrado' && (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 space-y-2 animate-fade-up">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold shadow-sm shrink-0">
                      <CheckCircle2 size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-bold text-emerald-900 truncate uppercase tracking-wider">
                        Fechamento Concluído e Encerrado
                      </h3>
                      <p className="text-xs text-emerald-700 leading-snug">
                        O fechamento deste PDV (
                        {locais.find((l) => l.id === localId)?.nome || 'PDV'}) já foi realizado e
                        encerrado. Não há cargas pendentes no momento.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setStatusFechamentoPDV('aberto')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-xs transition-colors"
                      >
                        Novo Fechamento
                      </button>
                      <button
                        type="button"
                        onClick={() => setEtapaAcerto('envio')}
                        className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-xs transition-colors"
                      >
                        <Package size={14} /> Novo Envio (Aba 1)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {etapaAcerto === 'fechamento' && statusFechamentoPDV === 'sem_carga' && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-2 animate-fade-up">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-600 text-white font-bold shadow-sm shrink-0">
                      <AlertTriangle size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200 truncate uppercase tracking-wider">
                        Nenhum Envio Pendente nesta Data (
                        {dataAcerto.split('-').reverse().join('/')})
                      </h3>
                      <p className="text-xs text-amber-800 dark:text-amber-300 leading-snug">
                        Não existem envios de produtos ou pendências de fechamento registrados para
                        este dia no PDV ({locais.find((l) => l.id === localId)?.nome || 'PDV'}).
                        Selecione outra data no campo acima ou registre um novo envio na Aba 1.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEtapaAcerto('envio')}
                      className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs rounded-lg shadow-xs transition-colors shrink-0"
                    >
                      <Package size={14} /> Ir para Envio (Aba 1)
                    </button>
                  </div>
                </div>
              )}

              {/* Seletor de Modo de Lançamento (Apenas na Aba 1 Envio / Unificado) */}
              {etapaAcerto !== 'fechamento' && (
                <div className="border-t border-primary/10 pt-4">
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-text/60">
                    Selecione o Modo de Lançamento:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setModo('detalhado')}
                      className={`flex items-center justify-center gap-2 rounded-xl p-3 text-xs font-bold transition-all border ${
                        modo === 'detalhado'
                          ? 'border-primary bg-primary text-white shadow-sm ring-2 ring-primary/30'
                          : 'border-primary/10 bg-background hover:bg-primary/5 text-text/70'
                      }`}
                    >
                      <ListOrdered className="h-4 w-4" /> Modo Romaneio (Por Doce)
                    </button>
                    <button
                      type="button"
                      onClick={() => setModo('rapido')}
                      className={`flex items-center justify-center gap-2 rounded-xl p-3 text-xs font-bold transition-all border ${
                        modo === 'rapido'
                          ? 'border-primary bg-primary text-white shadow-sm ring-2 ring-primary/30'
                          : 'border-primary/10 bg-background hover:bg-primary/5 text-text/70'
                      }`}
                    >
                      <Layers className="h-4 w-4" /> Modo Rápido (Volume Global)
                    </button>
                  </div>
                </div>
              )}

              {/* Seletor de Tipo de Registro de Fechamento (Apenas no Fechamento/Unificado) */}
              {etapaAcerto !== 'envio' && (
                <div className="border-t border-primary/10 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-text/60 flex items-center gap-1.5">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                      Tipo de Fechamento do Turno/Dia:
                    </label>
                    <button
                      type="button"
                      onClick={() => setMostrarOpcoesFechamento(!mostrarOpcoesFechamento)}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 transition-colors"
                    >
                      {mostrarOpcoesFechamento ? (
                        <>
                          Recolher opções <ChevronUp className="h-3.5 w-3.5" />
                        </>
                      ) : (
                        <>
                          Alterar modalidade <ChevronDown className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </div>

                  {!mostrarOpcoesFechamento ? (
                    <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-3">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        {tipoFechamento === 'parcial' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20 shrink-0">
                            🔵 Fechamento Parcial (Sobra em Loja)
                          </span>
                        )}
                        {tipoFechamento === 'semanal' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20 shrink-0">
                            🟣 Encerramento Semanal
                          </span>
                        )}
                        {tipoFechamento === 'diario' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 shrink-0">
                            🟢 Fechamento Padrão
                          </span>
                        )}
                        <span className="text-[11px] text-text/60">
                          {tipoFechamento === 'parcial' &&
                            'Sobra fica no PDV para o próximo turno/dia.'}
                          {tipoFechamento === 'semanal' &&
                            'Contabilidade e baixa final das sobras acumuladas no ciclo.'}
                          {tipoFechamento === 'diario' &&
                            'Recolhimento e acerto diário obrigatório.'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMostrarOpcoesFechamento(true)}
                        className="text-xs font-medium text-text/50 hover:text-primary hover:underline shrink-0 ml-2"
                      >
                        Trocar
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setTipoFechamento('parcial');
                          setMostrarOpcoesFechamento(false);
                        }}
                        className={`flex flex-col items-start justify-between rounded-xl p-3 text-left border transition-all ${
                          tipoFechamento === 'parcial'
                            ? 'border-cyan-500 bg-cyan-500/10 text-cyan-900 dark:text-cyan-200 ring-2 ring-cyan-500/30 font-bold'
                            : 'border-primary/10 bg-background hover:bg-primary/5 text-text/70'
                        }`}
                      >
                        <span className="font-bold text-xs">🔵 Fechamento Parcial</span>
                        <span className="text-[10px] text-text/50 mt-1 leading-snug">
                          Sobra fica no PDV para o próximo turno ou dia seguinte
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTipoFechamento('semanal');
                          setMostrarOpcoesFechamento(false);
                        }}
                        className={`flex flex-col items-start justify-between rounded-xl p-3 text-left border transition-all ${
                          tipoFechamento === 'semanal'
                            ? 'border-purple-500 bg-purple-500/10 text-purple-900 dark:text-purple-200 ring-2 ring-purple-500/30 font-bold'
                            : 'border-primary/10 bg-background hover:bg-primary/5 text-text/70'
                        }`}
                      >
                        <span className="font-bold text-xs">🟣 Encerramento Semanal</span>
                        <span className="text-[10px] text-text/50 mt-1 leading-snug">
                          Contabilidade e baixa final das sobras acumuladas no ciclo
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTipoFechamento('diario');
                          setMostrarOpcoesFechamento(false);
                        }}
                        className={`flex flex-col items-start justify-between rounded-xl p-3 text-left border transition-all ${
                          tipoFechamento === 'diario'
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/30 font-bold'
                            : 'border-primary/10 bg-background hover:bg-primary/5 text-text/70'
                        }`}
                      >
                        <span className="font-bold text-xs">🟢 Fechamento Padrão</span>
                        <span className="text-[10px] text-text/50 mt-1 leading-snug">
                          Recolhimento e acerto diário obrigatório
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 border-t border-primary/10 pt-4 items-end">
                <div className="flex flex-col">
                  <label className="flex h-5 items-center gap-1 text-xs font-semibold text-text/70 mb-1">
                    <Calendar className="h-3.5 w-3.5 text-text/50 shrink-0" /> Data
                  </label>
                  <input
                    type="date"
                    value={dataAcerto}
                    onChange={(e) => setDataAcerto(e.target.value)}
                    className="h-10 w-full rounded-xl border border-primary/20 bg-background px-3 text-sm outline-none focus:border-primary"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="flex h-5 items-center gap-1 text-xs font-semibold text-text/70 mb-1">
                    <Clock className="h-3.5 w-3.5 text-text/50 shrink-0" /> Turno
                  </label>
                  <select
                    value={turno}
                    onChange={(e) => setTurno(e.target.value as any)}
                    className="h-10 w-full rounded-xl border border-primary/20 bg-background px-3 text-sm outline-none focus:border-primary"
                  >
                    <option value="integral">Integral (Dia Todo)</option>
                    <option value="manha">Manhã</option>
                    <option value="tarde">Tarde</option>
                    <option value="noite">Noite</option>
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="flex h-5 items-center justify-between text-xs font-semibold text-text/70 mb-1">
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-text/50 shrink-0" /> Atendente / Vendedor
                    </span>
                    {etapaAcerto === 'fechamento' && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5">
                        🔒 Registrado
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={vendedorNome}
                    onChange={(e) => setVendedorNome(e.target.value)}
                    disabled={etapaAcerto === 'fechamento'}
                    placeholder={
                      etapaAcerto === 'fechamento' ? 'Carregado do Envio (Aba 1)' : 'Ex: Maria'
                    }
                    className={`h-10 w-full rounded-xl border border-primary/20 bg-background px-3 text-sm outline-none focus:border-primary ${
                      etapaAcerto === 'fechamento'
                        ? 'bg-primary/5 text-text/80 cursor-not-allowed font-semibold opacity-90'
                        : ''
                    }`}
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
                      <Package className="h-4 w-4 text-primary" />
                      {etapaAcerto === 'envio'
                        ? '1. Envio de Produtos para o PDV'
                        : 'Romaneio de Produtos enviados por PDV'}
                    </h2>
                    <span className="text-[11px] text-text/50">
                      {etapaAcerto === 'envio'
                        ? '📦 Digite a quantidade enviada de cada produto para o PDV selecionado.'
                        : tipoFechamento === 'parcial'
                          ? '🔵 Sobra em Loja: Produtos não recolhidos permanecem no estoque do PDV.'
                          : tipoFechamento === 'semanal'
                            ? '🟣 Encerramento Semanal: Informe a sobra física final recolhida.'
                            : '🟢 Fechamento Padrão: Digite o retorno físico do dia.'}
                    </span>
                  </div>

                  {etapaAcerto !== 'envio' && (
                    <button
                      type="button"
                      disabled={isFechamentoBloqueado}
                      onClick={handleVendeuTudoZerarSobras}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ⚡ Vendeu Tudo (Sobra Zero)
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto space-y-4">
                  {(() => {
                    const totalEnviadoAnteriorDetalhado = gradeItens.reduce(
                      (acc, i) => acc + (Number(i.qtd_enviada_anterior) || 0),
                      0
                    );

                    const itensExibidos =
                      etapaAcerto !== 'envio'
                        ? gradeItens.filter(
                            (item) =>
                              (Number(item.qtd_enviada) || 0) +
                                (Number(item.qtd_sobra_anterior) || 0) >
                              0
                          )
                        : gradeItens;

                    if (etapaAcerto !== 'envio' && itensExibidos.length === 0) {
                      return (
                        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center space-y-2 my-2">
                          <Package className="mx-auto h-8 w-8 text-primary/60" />
                          <h3 className="font-bold text-sm text-text/80">
                            Nenhum produto com quantidade enviado para este PDV
                          </h3>
                          <p className="text-xs text-text/60 max-w-md mx-auto">
                            Acesse a aba <strong>"1. Envio de Produtos para o PDV"</strong> para
                            cadastrar a quantidade enviada antes de realizar o fechamento.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <>
                        {/* Banner Informativo de Envio Anterior / Adicional em Aba 1 */}
                        {etapaAcerto === 'envio' && totalEnviadoAnteriorDetalhado > 0 && (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                            <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                              <CheckCircle2 className="h-4 w-4 text-amber-600 shrink-0" />
                              <span>
                                {modoEdicaoEnvio
                                  ? '⚠️ Modo de Correção: Você está alterando o total do envio anterior.'
                                  : `📦 Já existe um envio de ${totalEnviadoAnteriorDetalhado} un gravado. Digite a quantidade ADICIONAL que deseja enviar.`}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setModoEdicaoEnvio(!modoEdicaoEnvio)}
                              className="px-3 py-1.5 text-xs font-bold rounded-xl border border-amber-500/40 bg-amber-500/20 text-amber-900 dark:text-amber-200 hover:bg-amber-500/30 transition-colors shrink-0"
                            >
                              {modoEdicaoEnvio
                                ? 'Voltar para Envio Adicional'
                                : '✏️ Corrigir Envio Anterior'}
                            </button>
                          </div>
                        )}

                        {/* Desktop View: Tabela adaptável por Etapa */}
                        <table className="hidden sm:table w-full text-left text-xs">
                          <thead className="border-b border-primary/10 bg-primary/5 font-bold uppercase text-text/50">
                            {etapaAcerto === 'envio' ? (
                              totalEnviadoAnteriorDetalhado > 0 && !modoEdicaoEnvio ? (
                                <tr>
                                  <th className="p-2.5">Doce / Produto</th>
                                  <th className="p-2.5 text-center">Preço Unit</th>
                                  <th className="p-2.5 text-center bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
                                    Já Enviado
                                  </th>
                                  <th className="p-2.5 text-center bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                                    Enviar + (Adicional)
                                  </th>
                                  <th className="p-2.5 text-center bg-primary/10 text-primary">
                                    Total Final Envio
                                  </th>
                                </tr>
                              ) : (
                                <tr>
                                  <th className="p-2.5">Doce / Produto</th>
                                  <th className="p-2.5 text-center">Preço Unit</th>
                                  <th className="p-2.5 text-center bg-primary/10 text-primary">
                                    Quantidade Enviada
                                  </th>
                                </tr>
                              )
                            ) : (
                              <tr>
                                <th className="p-2.5">Doce / Produto</th>
                                <th className="p-2.5 text-center">Preço Unit</th>
                                <th className="p-2.5 text-center">Sobra Anterior</th>
                                <th className="p-2.5 text-center">Envio Hoje</th>
                                <th className="p-2.5 text-center">Total Disp.</th>
                                <th className="p-2.5 text-center bg-amber-100/50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300">
                                  Sobras (Retorno)
                                </th>
                                <th className="p-2.5 text-right">Vendidos</th>
                                <th className="p-2.5 text-right">Subtotal</th>
                              </tr>
                            )}
                          </thead>
                          <tbody className="divide-y divide-primary/5">
                            {itensExibidos.map((item) => {
                              const disp = (item.qtd_sobra_anterior || 0) + (item.qtd_enviada || 0);
                              const vend = Math.max(0, disp - (item.qtd_retorno || 0));
                              const subtotal = vend * item.preco_unitario;

                              if (etapaAcerto === 'envio') {
                                if (totalEnviadoAnteriorDetalhado > 0 && !modoEdicaoEnvio) {
                                  return (
                                    <tr
                                      key={item.produto_id}
                                      className="hover:bg-primary/5 transition-colors"
                                    >
                                      <td className="p-2.5 font-bold text-text/80">{item.nome}</td>
                                      <td className="p-2.5 text-center font-mono text-text/60">
                                        R$ {item.preco_unitario.toFixed(2)}
                                      </td>
                                      <td className="p-2.5 text-center font-mono font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-50/50 dark:bg-cyan-950/20">
                                        {item.qtd_enviada_anterior || 0} un
                                      </td>
                                      <td className="p-2.5 text-center">
                                        <input
                                          type="number"
                                          min="0"
                                          value={item.qtd_enviada_nova || ''}
                                          onChange={(e) =>
                                            handleAtualizarItemGrade(
                                              item.produto_id,
                                              'qtd_enviada_nova',
                                              Number(e.target.value)
                                            )
                                          }
                                          placeholder="0"
                                          className="w-20 rounded-xl border border-emerald-500/40 bg-background px-3 py-1.5 text-center font-bold text-emerald-600 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                        />
                                      </td>
                                      <td className="p-2.5 text-center font-mono font-extrabold text-primary">
                                        {(item.qtd_enviada_anterior || 0) +
                                          (item.qtd_enviada_nova || 0)}{' '}
                                        un
                                      </td>
                                    </tr>
                                  );
                                }

                                return (
                                  <tr
                                    key={item.produto_id}
                                    className="hover:bg-primary/5 transition-colors"
                                  >
                                    <td className="p-2.5 font-bold text-text/80">{item.nome}</td>
                                    <td className="p-2.5 text-center font-mono text-text/60">
                                      R$ {item.preco_unitario.toFixed(2)}
                                    </td>
                                    <td className="p-2.5 text-center">
                                      <input
                                        type="number"
                                        min="0"
                                        value={item.qtd_enviada || ''}
                                        onChange={(e) =>
                                          handleAtualizarItemGrade(
                                            item.produto_id,
                                            'qtd_enviada',
                                            Number(e.target.value)
                                          )
                                        }
                                        placeholder="0"
                                        className="w-20 rounded-xl border border-primary/40 bg-background px-3 py-1.5 text-center font-bold text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                      />
                                    </td>
                                  </tr>
                                );
                              }

                              return (
                                <tr
                                  key={item.produto_id}
                                  className="hover:bg-primary/5 transition-colors"
                                >
                                  <td className="p-2.5 font-bold text-text/80">{item.nome}</td>
                                  <td className="p-2.5 text-center font-mono text-text/60">
                                    R$ {item.preco_unitario.toFixed(2)}
                                  </td>
                                  <td className="p-2.5 text-center font-mono text-cyan-600 font-bold bg-cyan-50/30 dark:bg-cyan-950/10">
                                    {item.qtd_sobra_anterior || 0} un
                                  </td>
                                  <td className="p-2.5 text-center font-mono font-semibold">
                                    {item.qtd_enviada || 0} un
                                  </td>
                                  <td className="p-2.5 text-center font-mono font-bold text-text/80">
                                    {disp} un
                                  </td>
                                  <td className="p-2.5 text-center">
                                    <input
                                      type="number"
                                      min="0"
                                      disabled={isFechamentoBloqueado}
                                      value={item.qtd_retorno || ''}
                                      onChange={(e) =>
                                        handleAtualizarItemGrade(
                                          item.produto_id,
                                          'qtd_retorno',
                                          Number(e.target.value)
                                        )
                                      }
                                      placeholder="0"
                                      className="w-16 rounded-lg border border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 px-2 py-1 text-center font-semibold text-amber-700 outline-none focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
                          <tfoot className="border-t-2 border-primary/20 bg-primary/10 font-bold text-xs">
                            {etapaAcerto === 'envio' ? (
                              totalEnviadoAnteriorDetalhado > 0 && !modoEdicaoEnvio ? (
                                <tr>
                                  <td className="p-3 font-extrabold uppercase tracking-wider text-text/80">
                                    Total Acumulado
                                  </td>
                                  <td className="p-3 text-center">-</td>
                                  <td className="p-3 text-center font-mono font-black text-cyan-700 dark:text-cyan-300 bg-cyan-500/10">
                                    {totalEnviadoAnteriorDetalhado} un
                                  </td>
                                  <td className="p-3 text-center font-mono font-black text-emerald-600 bg-emerald-500/10">
                                    +{totalEnviadoNovoDetalhado} un
                                  </td>
                                  <td className="p-3 text-center font-mono text-base font-black text-primary">
                                    {totalEnviadoDetalhado} un
                                  </td>
                                </tr>
                              ) : (
                                <tr>
                                  <td className="p-3 font-extrabold uppercase tracking-wider text-text/80">
                                    Total a Enviar
                                  </td>
                                  <td className="p-3 text-center">-</td>
                                  <td className="p-3 text-center font-mono text-base font-black text-primary">
                                    {totalEnviadoDetalhado} un
                                  </td>
                                </tr>
                              )
                            ) : (
                              <tr>
                                <td className="p-3 font-extrabold uppercase tracking-wider text-text/80">
                                  Totais
                                </td>
                                <td className="p-3 text-center">-</td>
                                <td className="p-3 text-center font-mono font-bold text-cyan-700 dark:text-cyan-300">
                                  {totalSobraAnteriorDetalhado} un
                                </td>
                                <td className="p-3 text-center font-mono font-bold">
                                  {totalEnviadoDetalhado} un
                                </td>
                                <td className="p-3 text-center font-mono font-black text-text/90">
                                  {totalDisponivelDetalhado} un
                                </td>
                                <td className="p-3 text-center font-mono font-extrabold text-amber-800 dark:text-amber-300 bg-amber-500/10">
                                  {totalRetornoDetalhado} un
                                </td>
                                <td className="p-3 text-right font-mono font-black text-primary">
                                  {totalVendidosDetalhado} un
                                </td>
                                <td className="p-3 text-right font-mono font-black text-text/90">
                                  R$ {faturamentoBrutoDetalhado.toFixed(2)}
                                </td>
                              </tr>
                            )}
                          </tfoot>
                        </table>

                        {/* Mobile View: Cards Adaptáveis por Etapa */}
                        <div className="block sm:hidden space-y-3">
                          {itensExibidos.map((item) => {
                            const disp = (item.qtd_sobra_anterior || 0) + (item.qtd_enviada || 0);
                            const vend = Math.max(0, disp - (item.qtd_retorno || 0));
                            const subtotal = vend * item.preco_unitario;

                            if (etapaAcerto === 'envio') {
                              if (totalEnviadoAnteriorDetalhado > 0 && !modoEdicaoEnvio) {
                                return (
                                  <div
                                    key={item.produto_id}
                                    className="rounded-2xl border border-primary/20 bg-background p-4 shadow-2xs space-y-3"
                                  >
                                    <div className="flex items-center justify-between border-b border-primary/10 pb-2">
                                      <span className="font-bold text-sm text-text/90">
                                        {item.nome}
                                      </span>
                                      <span className="rounded-lg bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                                        R$ {item.preco_unitario.toFixed(2)}/un
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <div className="rounded-xl bg-cyan-50 dark:bg-cyan-950/30 p-2 border border-cyan-200 dark:border-cyan-800 text-center">
                                        <span className="block text-[10px] text-cyan-800 dark:text-cyan-300 font-semibold">
                                          Já Enviado
                                        </span>
                                        <strong className="font-mono text-cyan-900 dark:text-cyan-200 text-sm">
                                          {item.qtd_enviada_anterior || 0} un
                                        </strong>
                                      </div>
                                      <div className="rounded-xl bg-primary/5 p-2 border border-primary/20 text-center">
                                        <span className="block text-[10px] text-primary font-semibold">
                                          Total Final
                                        </span>
                                        <strong className="font-mono text-primary text-sm">
                                          {(item.qtd_enviada_anterior || 0) +
                                            (item.qtd_enviada_nova || 0)}{' '}
                                          un
                                        </strong>
                                      </div>
                                    </div>

                                    <div className="space-y-1">
                                      <label className="block text-xs font-bold text-emerald-600">
                                        ➕ Enviar Mais (Adicional):
                                      </label>
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleAtualizarItemGrade(
                                              item.produto_id,
                                              'qtd_enviada_nova',
                                              Math.max(0, (item.qtd_enviada_nova || 0) - 1)
                                            )
                                          }
                                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-lg font-bold text-emerald-600 active:scale-95 shrink-0 select-none"
                                        >
                                          -
                                        </button>
                                        <input
                                          type="number"
                                          min="0"
                                          value={item.qtd_enviada_nova || ''}
                                          onChange={(e) =>
                                            handleAtualizarItemGrade(
                                              item.produto_id,
                                              'qtd_enviada_nova',
                                              Number(e.target.value)
                                            )
                                          }
                                          placeholder="0"
                                          className="h-10 w-full rounded-xl border border-emerald-500/40 bg-background px-2 text-center font-bold text-emerald-600 text-base outline-none focus:border-emerald-500"
                                        />
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleAtualizarItemGrade(
                                              item.produto_id,
                                              'qtd_enviada_nova',
                                              (item.qtd_enviada_nova || 0) + 1
                                            )
                                          }
                                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-lg font-bold text-emerald-600 active:scale-95 shrink-0 select-none"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div
                                  key={item.produto_id}
                                  className="rounded-2xl border border-primary/20 bg-background p-4 shadow-2xs space-y-3"
                                >
                                  <div className="flex items-center justify-between border-b border-primary/10 pb-2">
                                    <span className="font-bold text-sm text-text/90">
                                      {item.nome}
                                    </span>
                                    <span className="rounded-lg bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                                      R$ {item.preco_unitario.toFixed(2)}/un
                                    </span>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="block text-xs font-bold text-primary">
                                      📦 Quantidade Enviada:
                                    </label>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleAtualizarItemGrade(
                                            item.produto_id,
                                            'qtd_enviada',
                                            Math.max(0, (item.qtd_enviada || 0) - 1)
                                          )
                                        }
                                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/5 text-lg font-bold text-primary active:scale-95 shrink-0 select-none"
                                      >
                                        -
                                      </button>
                                      <input
                                        type="number"
                                        min="0"
                                        value={item.qtd_enviada || ''}
                                        onChange={(e) =>
                                          handleAtualizarItemGrade(
                                            item.produto_id,
                                            'qtd_enviada',
                                            Number(e.target.value)
                                          )
                                        }
                                        placeholder="0"
                                        className="h-10 w-full rounded-xl border border-primary/30 bg-background px-2 text-center font-bold text-primary text-base outline-none focus:border-primary"
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleAtualizarItemGrade(
                                            item.produto_id,
                                            'qtd_enviada',
                                            (item.qtd_enviada || 0) + 1
                                          )
                                        }
                                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-lg font-bold text-primary active:scale-95 shrink-0 select-none"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={item.produto_id}
                                className="rounded-2xl border border-primary/15 bg-background p-4 shadow-2xs space-y-3"
                              >
                                {/* Header: Nome do Produto e Preço */}
                                <div className="flex items-center justify-between border-b border-primary/10 pb-2">
                                  <span className="font-bold text-sm text-text/90">
                                    {item.nome}
                                  </span>
                                  <span className="rounded-lg bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                                    R$ {item.preco_unitario.toFixed(2)}/un
                                  </span>
                                </div>

                                {/* Pílulas de Estoque */}
                                <div className="grid grid-cols-3 gap-1.5 text-center text-[11px]">
                                  <div className="rounded-xl bg-cyan-50 dark:bg-cyan-950/30 p-1.5 border border-cyan-200 dark:border-cyan-800">
                                    <span className="block text-[10px] text-cyan-800 dark:text-cyan-300 font-semibold">
                                      Sobra Ant.
                                    </span>
                                    <strong className="font-mono text-cyan-900 dark:text-cyan-200">
                                      {item.qtd_sobra_anterior || 0} un
                                    </strong>
                                  </div>
                                  <div className="rounded-xl bg-slate-100 dark:bg-slate-800 p-1.5 border border-slate-200 dark:border-slate-700">
                                    <span className="block text-[10px] text-text/60 font-semibold">
                                      Total Disp.
                                    </span>
                                    <strong className="font-mono text-text/90">{disp} un</strong>
                                  </div>
                                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-1.5 border border-emerald-200 dark:border-emerald-800">
                                    <span className="block text-[10px] text-emerald-800 dark:text-emerald-300 font-semibold">
                                      Vendidos
                                    </span>
                                    <strong className="font-mono text-emerald-900 dark:text-emerald-200">
                                      {vend} un
                                    </strong>
                                  </div>
                                </div>

                                {/* Campos de Quantidade com Botões Stepper (- e +) */}
                                <div className="grid grid-cols-2 gap-3 pt-1">
                                  {/* Envio Hoje */}
                                  <div className="space-y-1">
                                    <label className="block text-[11px] font-bold text-text/70">
                                      📦 Envio Hoje:
                                    </label>
                                    <div className="flex h-9 w-full items-center justify-center rounded-xl border border-primary/10 bg-primary/5 font-mono text-xs font-bold text-primary">
                                      {item.qtd_enviada || 0} un
                                    </div>
                                  </div>

                                  {/* Sobras / Retorno */}
                                  <div className="space-y-1">
                                    <label className="block text-[11px] font-bold text-amber-800 dark:text-amber-300">
                                      ↩️ Sobras (Retorno):
                                    </label>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        disabled={isFechamentoBloqueado}
                                        onClick={() =>
                                          handleAtualizarItemGrade(
                                            item.produto_id,
                                            'qtd_retorno',
                                            Math.max(0, (item.qtd_retorno || 0) - 1)
                                          )
                                        }
                                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-300 bg-amber-50 text-base font-bold text-amber-800 active:scale-95 shrink-0 select-none disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        -
                                      </button>
                                      <input
                                        type="number"
                                        min="0"
                                        disabled={isFechamentoBloqueado}
                                        value={item.qtd_retorno || ''}
                                        onChange={(e) =>
                                          handleAtualizarItemGrade(
                                            item.produto_id,
                                            'qtd_retorno',
                                            Number(e.target.value)
                                          )
                                        }
                                        placeholder="0"
                                        className="h-9 w-full rounded-xl border border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 px-2 text-center font-bold text-amber-900 dark:text-amber-200 outline-none focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                      />
                                      <button
                                        type="button"
                                        disabled={isFechamentoBloqueado}
                                        onClick={() =>
                                          handleAtualizarItemGrade(
                                            item.produto_id,
                                            'qtd_retorno',
                                            (item.qtd_retorno || 0) + 1
                                          )
                                        }
                                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-300 bg-amber-100 text-base font-bold text-amber-900 active:scale-95 shrink-0 select-none disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* Subtotal do Produto */}
                                <div className="flex items-center justify-between border-t border-primary/10 pt-2 text-xs font-bold">
                                  <span className="text-text/60">Subtotal Parcial:</span>
                                  <span className="font-mono text-primary">
                                    R$ {subtotal.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}

                          {/* Card Resumo do Total em Tempo Real no Mobile */}
                          {etapaAcerto === 'envio' ? (
                            <div className="rounded-2xl border-2 border-primary/30 bg-primary/10 p-4 shadow-sm space-y-2 mt-4">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-extrabold uppercase tracking-wider text-text/80">
                                  📦 Total Unidades a Enviar:
                                </span>
                                <span className="font-mono text-xl font-black text-primary">
                                  {totalEnviadoDetalhado} un
                                </span>
                              </div>
                              {totalEnviadoAnteriorDetalhado > 0 && !modoEdicaoEnvio && (
                                <div className="flex justify-between text-xs border-t border-primary/10 pt-2 font-medium">
                                  <span className="text-text/60">
                                    Já enviado:{' '}
                                    <strong className="text-cyan-700 dark:text-cyan-300 font-mono">
                                      {totalEnviadoAnteriorDetalhado} un
                                    </strong>
                                  </span>
                                  <span className="text-text/60">
                                    Adicional novo:{' '}
                                    <strong className="text-emerald-600 font-mono">
                                      +{totalEnviadoNovoDetalhado} un
                                    </strong>
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="rounded-2xl border-2 border-primary/30 bg-primary/10 p-4 shadow-sm space-y-2 mt-4">
                              <div className="flex justify-between items-center text-xs pb-1.5 border-b border-primary/10">
                                <span className="font-bold text-text/80">Total Vendidos:</span>
                                <span className="font-mono text-sm font-black text-primary">
                                  {totalVendidosDetalhado} un
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-xs pb-1.5 border-b border-primary/10">
                                <span className="font-bold text-text/80">
                                  Total Sobras em Loja:
                                </span>
                                <span className="font-mono text-sm font-black text-amber-700 dark:text-amber-300">
                                  {totalRetornoDetalhado} un
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-text/80">Faturamento Bruto:</span>
                                <span className="font-mono text-sm font-black text-text/90">
                                  R$ {faturamentoBrutoDetalhado.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Ajustes / Perdas / Cortesias (Apenas no Fechamento/Unificado) */}
                {etapaAcerto !== 'envio' && (
                  <div className="border-t border-primary/10 pt-4">
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-text/60">
                      Ajustes de Turno (Perdas, Avarias, Brindes ou Descontos)
                    </h3>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        disabled={isFechamentoBloqueado}
                        value={novaPerdaDesc}
                        onChange={(e) => setNovaPerdaDesc(e.target.value)}
                        placeholder="Motivo (ex: 1 brownie caiu no chão)"
                        className="flex-1 rounded-xl border border-primary/20 bg-background px-3 py-1.5 text-xs outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <BRLCurrencyInput
                        value={novaPerdaValor}
                        disabled={isFechamentoBloqueado}
                        onChange={(val) => setNovaPerdaValor(val)}
                        placeholder="R$ 0,00"
                        className="w-28 rounded-xl border border-primary/20 bg-background px-3 py-1.5 text-xs outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <button
                        type="button"
                        disabled={isFechamentoBloqueado}
                        onClick={handleAdicionarPerda}
                        className="flex items-center justify-center gap-1 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
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
                              <button
                                type="button"
                                disabled={isFechamentoBloqueado}
                                onClick={() => handleRemoverPerda(p.id)}
                                className="disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-rose-500 hover:text-rose-700" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Modo Rápido (Volume Global) */
              <div className="space-y-4 rounded-2xl border border-primary/10 bg-background p-5 shadow-sm">
                <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text/60">
                  <Layers className="h-4 w-4 text-primary" /> Lançamento por Volume Global (Sem
                  discriminar produtos)
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

                  {etapaAcerto !== 'envio' && (
                    <>
                      <div>
                        <label className="text-xs font-semibold text-text/70">
                          Qtd Retorno (Sobras)
                        </label>
                        <input
                          type="number"
                          min="0"
                          disabled={isFechamentoBloqueado}
                          value={qtdRetornoRapida || ''}
                          onChange={(e) => setQtdRetornoRapida(Number(e.target.value))}
                          placeholder="Ex: 15"
                          className="mt-1 w-full rounded-xl border border-primary/20 bg-background px-3 py-2 text-base font-semibold outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-text/70">
                          Preço Médio Estimado
                        </label>
                        <BRLCurrencyInput
                          value={precoMedioRapido}
                          disabled={isFechamentoBloqueado}
                          onChange={(val) => setPrecoMedioRapido(val)}
                          placeholder="R$ 8,00"
                          className="mt-1 w-full rounded-xl border border-primary/20 bg-background px-3 py-2 text-base font-semibold outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                    </>
                  )}
                </div>

                {etapaAcerto === 'envio' && (
                  <div className="rounded-xl border border-amber-300/40 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-xs text-amber-800 dark:text-amber-300">
                    ⚠️ <strong>Lançamento por Volume Global:</strong> Ao enviar o total acumulado
                    sem discriminar produtos, a apuração detalhada por item fica desabilitada e a
                    conferência financeira precisará ser realizada por volume global no fechamento.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Painel Lateral (Modo Envio de Carga vs Modo Fechamento) */}
          {etapaAcerto === 'envio' ? (
            <div className="space-y-4 rounded-2xl border border-primary/15 bg-background p-5 shadow-sm h-fit">
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                <Package className="h-4 w-4 text-primary" /> 1. Resumo do Envio ao PDV
              </h2>

              <div className="rounded-xl border border-primary/10 bg-primary/5 p-4 space-y-3">
                <p className="text-xs text-text/70 leading-relaxed">
                  Nesta etapa você registra a <strong>quantidade de produtos enviada</strong> ao
                  ponto de venda selecionado.
                </p>

                <div className="flex items-center justify-between rounded-xl bg-background p-3 border border-primary/10">
                  <span className="text-xs font-semibold text-text/60">
                    Total Unidades Enviadas:
                  </span>
                  <span className="font-mono text-base font-bold text-primary">
                    {totalEnviado} un
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={salvando || totalEnviado <= 0}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-sm transition-all hover:opacity-95 active:scale-95 disabled:opacity-50"
                >
                  <Package className="h-4 w-4" />
                  {salvando
                    ? 'Gravando Envio...'
                    : modoEdicaoEnvio
                      ? 'Salvar Correção do Envio'
                      : gradeItens.some((i) => (Number(i.qtd_enviada_anterior) || 0) > 0)
                        ? 'Registrar Envio Adicional'
                        : 'Registrar Envio de Produtos'}
                </button>

                <button
                  type="button"
                  onClick={() => setEtapaAcerto('fechamento')}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 py-2.5 text-xs font-bold text-primary hover:bg-primary/10 transition-all"
                >
                  <span>Avançar para Sobras & Fechamento</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 rounded-2xl border border-primary/10 bg-background p-5 shadow-sm h-fit">
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text/60">
                <DollarSign className="h-4 w-4 text-primary" /> 2. Apuração Financeira do PDV
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="flex items-center justify-between text-xs font-bold text-text/70">
                    <span className="flex items-center gap-1">
                      <Banknote className="h-3.5 w-3.5 text-emerald-600" /> Valor em Dinheiro R$
                    </span>
                  </label>
                  <BRLCurrencyInput
                    value={valorDinheiro}
                    disabled={isFechamentoBloqueado}
                    onChange={(val) => setValorDinheiro(val)}
                    placeholder="R$ 0,00"
                    className="mt-1 w-full rounded-xl border border-emerald-300 bg-emerald-50/30 dark:bg-emerald-950/20 px-3 py-2 text-base font-mono font-bold text-emerald-700 outline-none focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="text-[10px] text-text/40">
                    Dinheiro recolhido no envelope/gaveta
                  </span>
                </div>

                <div className="border-t border-primary/10 pt-3">
                  <button
                    type="button"
                    onClick={() => setMostrarPixCartao(!mostrarPixCartao)}
                    className="flex w-full items-center justify-between text-xs font-bold text-cyan-900 dark:text-cyan-200 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 p-2.5 rounded-xl hover:bg-cyan-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <QrCode className="h-4 w-4 text-cyan-600" />
                      <span>Valores Declarados Pix / Cartão (Opcional)</span>
                    </div>
                    <span className="text-[10px] text-cyan-700 dark:text-cyan-300 font-semibold bg-cyan-100/80 dark:bg-cyan-900/80 px-2 py-0.5 rounded-full">
                      {mostrarPixCartao
                        ? 'Ocultar ▲'
                        : 'Preencher agora ou no fechamento noturno ▼'}
                    </span>
                  </button>

                  {(mostrarPixCartao || Number(valorPix) > 0 || Number(valorCartao) > 0) && (
                    <div className="mt-3 space-y-3 pt-1 border-t border-cyan-200/50 dark:border-cyan-800/50 animate-fade-in">
                      <div>
                        <label className="text-xs font-semibold text-text/70">
                          Valor em Pix no PDV R$ (Opcional)
                        </label>
                        <BRLCurrencyInput
                          value={valorPix}
                          disabled={isFechamentoBloqueado}
                          onChange={(val) => setValorPix(val)}
                          placeholder="R$ 0,00"
                          className="mt-1 w-full rounded-xl border border-primary/20 bg-background px-3 py-1.5 text-xs font-mono outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-text/70">
                          Valor em Cartão no PDV R$ (Opcional)
                        </label>
                        <BRLCurrencyInput
                          value={valorCartao}
                          disabled={isFechamentoBloqueado}
                          onChange={(val) => setValorCartao(val)}
                          placeholder="R$ 0,00"
                          className="mt-1 w-full rounded-xl border border-primary/20 bg-background px-3 py-1.5 text-xs font-mono outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-text/70">Observações do Turno</label>
                  <textarea
                    rows={2}
                    disabled={isFechamentoBloqueado}
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Ex: Troca de turno rápida"
                    className="mt-1 w-full rounded-xl border border-primary/20 bg-background px-3 py-1.5 text-xs outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
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

                {/* Destaque do Compromisso Digital Pix/Cartão e Contabilização das Diferenças */}
                <div className="mt-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/30 p-3 border border-cyan-200 dark:border-cyan-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-cyan-800 dark:text-cyan-300">
                      🎯 Pix + Cartão Esperado:
                    </span>
                    <span className="font-mono text-base font-black text-cyan-700 dark:text-cyan-300">
                      R$ {pixCartaoEsperado.toFixed(2)}
                    </span>
                  </div>

                  {declaraDigital && (
                    <>
                      <div className="flex justify-between items-center text-xs border-t border-cyan-200/60 dark:border-cyan-800/60 pt-1.5">
                        <span className="text-[11px] font-semibold text-cyan-800 dark:text-cyan-300">
                          📱 Pix + Cartão Declarado:
                        </span>
                        <span className="font-mono font-bold text-cyan-900 dark:text-cyan-200">
                          R$ {totalDigitalDeclarado.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-[10px] text-cyan-700 dark:text-cyan-400 flex justify-between">
                        <span>
                          (Pix: R$ {(Number(valorPix) || 0).toFixed(2)} | Cartão: R${' '}
                          {(Number(valorCartao) || 0).toFixed(2)})
                        </span>
                      </div>
                      <div
                        className={`flex justify-between items-center text-xs font-bold pt-1 border-t border-cyan-200/60 dark:border-cyan-800/60 ${
                          diferencaDigital < -0.05
                            ? 'text-rose-600 dark:text-rose-400'
                            : diferencaDigital > 0.05
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-cyan-700 dark:text-cyan-300'
                        }`}
                      >
                        <span>Diferença Digital (Pix/Cartão):</span>
                        <span className="font-mono">
                          {diferencaDigital > 0 ? '+' : ''}R$ {diferencaDigital.toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {declaraDigital && (
                  <div
                    className={`mt-2 flex items-center justify-between rounded-xl p-3 font-bold ${
                      diferencaCaixa < -1
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 border border-rose-200'
                        : diferencaCaixa > 1
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 border border-emerald-200'
                          : 'bg-cyan-50 text-cyan-800 dark:bg-cyan-950/30 border border-cyan-200'
                    }`}
                  >
                    <span>
                      {diferencaCaixa < -1
                        ? 'Furo no Caixa:'
                        : diferencaCaixa > 1
                          ? 'Sobra no Caixa:'
                          : 'Diferença Global:'}
                    </span>
                    <span className="font-mono">R$ {diferencaCaixa.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Nota Explicativa Colapsável sobre os Modos de Fechamento */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
                <button
                  type="button"
                  onClick={() => setMostrarAjudaFechamento(!mostrarAjudaFechamento)}
                  className="flex w-full items-center justify-between text-xs font-bold text-primary hover:underline transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <HelpCircle className="h-4 w-4 text-primary shrink-0" />
                    Dúvidas sobre qual opção de fechamento escolher?
                  </span>
                  <span className="text-[11px] font-semibold text-primary/80 shrink-0">
                    {mostrarAjudaFechamento ? 'Recolher ▲' : 'Ver Guia Rápido ▼'}
                  </span>
                </button>

                {mostrarAjudaFechamento && (
                  <div className="pt-2 border-t border-primary/10 space-y-2 text-[11px] leading-relaxed animate-fade-in">
                    <div className="rounded-lg bg-amber-500/10 p-2.5 border border-amber-500/20 text-amber-900 dark:text-amber-200">
                      <strong className="block font-extrabold text-amber-800 dark:text-amber-300 mb-0.5">
                        🔵 Salvar Fechamento Parcial (Sobras + Valores):
                      </strong>
                      Ideal para a{' '}
                      <strong>troca de turno durante o dia (ex: Manhã ➡️ Tarde)</strong>. Grava as
                      sobras físicas e o dinheiro em espécie recolhido da gaveta, permitindo deixar
                      a conferência de Pix e Cartão para depois no Fechamento Noturno.
                    </div>

                    <div className="rounded-lg bg-emerald-500/10 p-2.5 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200">
                      <strong className="block font-extrabold text-emerald-800 dark:text-emerald-300 mb-0.5">
                        🟢 Encerrar Turno Completo:
                      </strong>
                      Conclusão <strong>definitiva do turno/dia</strong> no PDV. Grava sobras,
                      dinheiro, Pix e Cartão, efetuando a conciliação financeira final e{' '}
                      <strong>bloqueando a edição</strong> por segurança.
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {isFechamentoBloqueado ? (
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFechamentoPDV('aberto');
                      toast({
                        title: 'Edição Liberada!',
                        description: 'Você pode alterar as sobras e os valores financeiros agora.',
                        variant: 'info',
                      });
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-amber-700 active:scale-95"
                  >
                    <Edit3 className="h-4 w-4" /> Reabrir / Liberar Edição do Fechamento
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={salvando || !localId}
                      onClick={(e) => handleSalvarRemessa(e, 'dinheiro_informado')}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200 py-2.5 text-xs font-black shadow-sm transition-all hover:bg-amber-500/20 active:scale-95 disabled:opacity-50"
                    >
                      <Banknote className="h-4 w-4 text-amber-600 shrink-0" />
                      {salvando ? 'Gravando...' : 'Salvar Fechamento Parcial (Sobras + Valores)'}
                    </button>

                    <button
                      type="button"
                      disabled={salvando || !localId}
                      onClick={(e) => handleSalvarRemessa(e, 'encerrado')}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-sm transition-all hover:opacity-95 active:scale-95 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      {salvando ? 'Gravando...' : 'Encerrar Turno Completo'}
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={handleGerarComprovantePDF}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 py-2.5 text-xs font-bold text-primary hover:bg-primary/10 transition-all"
                >
                  <Printer className="h-4 w-4" /> Gerar Recibo / PDF do Romaneio
                </button>
              </div>
            </div>
          )}
        </form>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={confirmDialog.handleCancel}
        onConfirm={confirmDialog.handleConfirm}
        title={confirmDialog.options.title}
        message={confirmDialog.options.message}
        confirmText={confirmDialog.options.confirmText}
        cancelText={confirmDialog.options.cancelText}
        variant={confirmDialog.options.variant}
      />

      {/* Modal de Sucesso no Centro da Tela com Animação e Confete */}
      {successModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-background border border-primary/20 p-6 shadow-2xl space-y-5 transform transition-all animate-scale-up">
            <button
              type="button"
              onClick={() => setSuccessModal({ ...successModal, isOpen: false })}
              className="absolute right-4 top-4 rounded-full p-2 text-text/40 hover:bg-primary/10 hover:text-text transition-all"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col items-center text-center space-y-2">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-8 ring-emerald-500/10">
                <CheckCircle2 className="h-10 w-10 animate-bounce" />
              </div>

              <h2 className="text-xl font-black text-text/90 tracking-tight">
                {successModal.title}
              </h2>
              <p className="text-xs text-text/60 leading-relaxed">{successModal.description}</p>
            </div>

            {successModal.detalhes && (
              <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4 space-y-3">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-primary/10">
                  <span className="font-semibold text-text/60">Ponto de Venda (PDV):</span>
                  <span className="font-bold text-primary">{successModal.detalhes.pdv}</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2 border-b border-primary/10">
                  <span className="font-semibold text-text/60">Data do Lançamento:</span>
                  <span className="font-mono font-bold text-text/80">
                    {successModal.detalhes.data}
                  </span>
                </div>

                {successModal.detalhes.totalEnviado !== undefined && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-text/60">Total de Produtos Enviados:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {successModal.detalhes.totalEnviado} un
                    </span>
                  </div>
                )}

                {successModal.detalhes.totalVendidos !== undefined && (
                  <div className="flex justify-between items-center text-xs pb-2 border-b border-primary/10">
                    <span className="font-semibold text-text/60">Unidades Vendidas:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {successModal.detalhes.totalVendidos} un
                    </span>
                  </div>
                )}

                {successModal.detalhes.valorDinheiro !== undefined && (
                  <div className="flex justify-between items-center text-xs pb-2 border-b border-primary/10">
                    <span className="font-semibold text-text/60">Dinheiro Físico:</span>
                    <span className="font-mono font-bold text-text/90">
                      R$ {successModal.detalhes.valorDinheiro.toFixed(2)}
                    </span>
                  </div>
                )}

                {successModal.detalhes.pixCartaoEsperado !== undefined && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-text/60">Pix / Cartão Esperado:</span>
                    <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                      R$ {successModal.detalhes.pixCartaoEsperado.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={handleGerarComprovantePDF}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 py-3 text-xs font-bold text-primary hover:bg-primary/10 transition-all active:scale-95"
              >
                <Printer className="h-4 w-4" /> Imprimir Comprovante
              </button>

              <button
                type="button"
                onClick={() => setSuccessModal({ ...successModal, isOpen: false })}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-bold text-white shadow-md hover:opacity-95 transition-all active:scale-95"
              >
                <CheckCircle2 className="h-4 w-4" /> OK / Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
