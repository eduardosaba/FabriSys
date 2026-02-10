'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import Loading from '@/components/ui/Loading';
import Button from '@/components/Button';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle,
  Clock,
  ChefHat,
  DollarSign,
  Wrench,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Modal, InputField } from '@/components/ui/shared';
import { useAuth } from '@/lib/auth';

// Tipos
interface EventoCalendario {
  id: string;
  titulo: string;
  data: string; // YYYY-MM-DD
  tipo: 'producao' | 'financeiro' | 'compras' | 'manutencao' | 'outros';
  status: 'pendente' | 'concluido';
  origem: 'sistema' | 'manual'; // Sistema = Ordem de Prod, Manual = Tarefa
  detalhe?: string;
}

export default function AgendaPage() {
  const { profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dataAtual, setDataAtual] = useState(new Date());
  const [eventos, setEventos] = useState<EventoCalendario[]>([]);
  const [diaSelecionado, setDiaSelecionado] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [novaTarefa, setNovaTarefa] = useState({
    titulo: '',
    tipo: 'outros',
    horario: '08:00',
  });

  // Modal de confirmação de exclusão
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [tarefaParaExcluir, setTarefaParaExcluir] = useState<string | null>(null);

  // --- LÓGICA DE CALENDÁRIO ---
  const nomeMes = dataAtual.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  const getDiasDoMes = (date: Date) => {
    const ano = date.getFullYear();
    const mes = date.getMonth();
    const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
    const ultimoDia = new Date(ano, mes + 1, 0).getDate();

    const dias: Array<Date | null> = [];
    // Preencher dias vazios antes do dia 1
    for (let i = 0; i < primeiroDiaSemana; i++) {
      dias.push(null);
    }
    // Preencher dias do mês
    for (let i = 1; i <= ultimoDia; i++) {
      dias.push(new Date(ano, mes, i));
    }
    return dias;
  };

  const diasGrid = getDiasDoMes(dataAtual);

  const mudarMes = (delta: number) => {
    const novaData = new Date(dataAtual);
    novaData.setMonth(novaData.getMonth() + delta);
    setDataAtual(novaData);
  };

  // --- BUSCA DE DADOS ---
  const carregarEventos = useCallback(async () => {
    if (authLoading) return;
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const ano = dataAtual.getFullYear();
      const mes = dataAtual.getMonth() + 1;

      // Intervalo do mês atual
      const inicioMes = `${ano}-${String(mes).padStart(2, '0')}-01`;
      const fimMes = new Date(ano, mes, 0).toISOString().split('T')[0];

      // 1. Buscar Ordens de Produção (Automático)
      const { data: ordens } = await supabase
        .from('ordens_producao')
        .select('id, numero_op, data_prevista, status, produto:produtos_finais(nome)')
        .gte('data_prevista', inicioMes)
        .lte('data_prevista', fimMes)
        .neq('status', 'cancelada');

      // 2. Buscar Tarefas Manuais
      const { data: tarefas } = await supabase
        .from('tarefas_agenda')
        .select('*')
        .gte('data_agendada', inicioMes)
        .lte('data_agendada', fimMes);

      // Unificar Listas
      const listaUnificada: EventoCalendario[] = [];

      ordens?.forEach((op: any) => {
        const prodField = op.produto;
        const prodObj = Array.isArray(prodField) ? prodField[0] : prodField;
        listaUnificada.push({
          id: op.id,
          titulo: `OP #${op.numero_op} - ${prodObj?.nome}`,
          data: op.data_prevista,
          tipo: 'producao',
          status: op.status === 'concluido' ? 'concluido' : 'pendente',
          origem: 'sistema',
          detalhe: `Status: ${op.status}`,
        });
      });

      tarefas?.forEach((t: any) => {
        listaUnificada.push({
          id: t.id,
          titulo: t.titulo,
          data: t.data_agendada,
          tipo: t.tipo ?? 'outros',
          status: t.concluido ? 'concluido' : 'pendente',
          origem: 'manual',
          detalhe: t.horario ? `Horário: ${String(t.horario).slice(0, 5)}` : '',
        });
      });

      setEventos(listaUnificada);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar agenda');
    } finally {
      setLoading(false);
    }
  }, [authLoading, profile?.id, dataAtual]);

  useEffect(() => {
    void carregarEventos();
  }, [carregarEventos]);

  // --- AÇÕES ---
  const salvarTarefa = async () => {
    if (!novaTarefa.titulo) return toast.error('Título obrigatório');
    if (!profile?.organization_id) return toast.error('Organização não encontrada');

    try {
      const { error } = await supabase.from('tarefas_agenda').insert({
        titulo: novaTarefa.titulo,
        tipo: novaTarefa.tipo,
        data_agendada: diaSelecionado,
        horario: novaTarefa.horario,
        organization_id: profile.organization_id,
        created_by: profile.id,
      });

      if (error) throw error;

      toast.success('Tarefa agendada!');
      setIsModalOpen(false);
      setNovaTarefa({ titulo: '', tipo: 'outros', horario: '08:00' });
      void carregarEventos();
    } catch (err) {
      console.error('Erro ao salvar tarefa:', err);
      toast.error(`Erro ao salvar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    }
  };

  const concluirTarefaManual = async (id: string, estadoAtual: boolean) => {
    try {
      console.log('✅ Concluindo tarefa:', id, 'Estado atual:', estadoAtual);
      const { error } = await supabase
        .from('tarefas_agenda')
        .update({ concluido: !estadoAtual })
        .eq('id', id);

      if (error) throw error;

      toast.success(!estadoAtual ? 'Tarefa concluída!' : 'Tarefa reaberta!');
      void carregarEventos();
    } catch (err) {
      console.error('Erro ao concluir tarefa:', err);
      toast.error('Erro ao atualizar tarefa');
    }
  };

  const excluirTarefa = (id: string) => {
    setTarefaParaExcluir(id);
    setIsConfirmDeleteOpen(true);
  };

  const confirmarExclusao = async () => {
    if (!tarefaParaExcluir) return;

    try {
      console.log('🗑️ Excluindo tarefa:', tarefaParaExcluir);
      const { error } = await supabase.from('tarefas_agenda').delete().eq('id', tarefaParaExcluir);

      if (error) throw error;

      toast.success('Tarefa excluída!');
      setIsConfirmDeleteOpen(false);
      setTarefaParaExcluir(null);
      void carregarEventos();
    } catch (err) {
      console.error('Erro ao excluir tarefa:', err);
      toast.error('Erro ao excluir tarefa');
    }
  };

  // --- RENDERIZADORES ---
  const getIconeTipo = (tipo: string) => {
    switch (tipo) {
      case 'producao':
        return <ChefHat size={14} />;
      case 'financeiro':
        return <DollarSign size={14} />;
      case 'manutencao':
        return <Wrench size={14} />;
      case 'compras':
        return <AlertCircle size={14} />;
      default:
        return <Clock size={14} />;
    }
  };

  const getCorTipo = (tipo: string) => {
    switch (tipo) {
      case 'producao':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'financeiro':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'manutencao':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'compras':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Filtra eventos do dia clicado
  const eventosDoDia = eventos.filter((e) => e.data === diaSelecionado);

  if (loading && eventos.length === 0) return <Loading />;

  return (
    <div className="flex flex-col min-h-screen md:h-[calc(100vh-6rem)] p-4 md:p-6 animate-fade-up gap-4 md:gap-6">
      <PageHeader
        title="Agenda & Compromissos"
        description="Visualize entregas de produção e tarefas administrativas."
        icon={CalendarIcon}
      />

      <div className="flex flex-col lg:flex-row gap-4 md:gap-6 flex-1">
        {/* LADO ESQUERDO: CALENDÁRIO */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6 flex flex-col min-h-[500px]">
          {/* Navegação Mês */}
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-slate-800 capitalize">{nomeMes}</h2>
            <div className="flex gap-2">
              <button
                onClick={() => mudarMes(-1)}
                className="p-3 md:p-2 hover:bg-slate-100 rounded-full transition-colors active:scale-95"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
              </button>
              <button
                onClick={() => mudarMes(1)}
                className="p-3 md:p-2 hover:bg-slate-100 rounded-full transition-colors active:scale-95"
                aria-label="Próximo mês"
              >
                <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>
          </div>

          {/* Grid Dias Semana */}
          <div className="grid grid-cols-7 mb-2 text-center gap-1">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
              <div
                key={d}
                className="text-[10px] md:text-xs font-bold text-slate-400 uppercase py-2"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Grid Dias Mês */}
          <div className="grid grid-cols-7 flex-1 auto-rows-fr gap-1 md:gap-1">
            {diasGrid.map((dia, idx) => {
              if (!dia) return <div key={`empty-${idx}`} className="bg-slate-50/50 rounded-lg" />;

              const diaStr = dia.toISOString().split('T')[0];
              const isSelected = diaStr === diaSelecionado;
              const isToday = diaStr === new Date().toISOString().split('T')[0];

              // Eventos deste dia para as bolinhas
              const evsDia = eventos.filter((e) => e.data === diaStr);
              const temProducao = evsDia.some((e) => e.tipo === 'producao');
              const temOutros = evsDia.some((e) => e.tipo !== 'producao');

              return (
                <div
                  key={diaStr}
                  onClick={() => setDiaSelecionado(diaStr)}
                  className={`
                    relative min-h-[48px] md:min-h-0 p-2 md:p-2 rounded-lg border cursor-pointer transition-all flex flex-col items-center justify-start
                    ${isSelected ? 'border-pink-500 bg-pink-50 ring-2 ring-pink-200' : 'border-slate-100 hover:border-pink-300 bg-white'}
                    ${isToday ? 'bg-blue-50 font-bold' : ''}
                  `}
                >
                  <span
                    className={`text-sm md:text-sm ${isToday ? 'text-blue-600' : 'text-slate-700'}`}
                  >
                    {dia.getDate()}
                  </span>

                  {/* Indicadores de Evento (Bolinhas) */}
                  <div className="flex gap-1 mt-1 md:mt-2">
                    {temProducao && (
                      <div className="w-2 h-2 rounded-full bg-blue-500" title="Produção" />
                    )}
                    {temOutros && (
                      <div className="w-2 h-2 rounded-full bg-orange-500" title="Tarefa" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* LADO DIREITO: DETALHES DO DIA */}
        <div className="w-full lg:w-96 bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6 flex flex-col max-h-[600px] lg:max-h-none">
          <div className="flex justify-between items-center mb-4 border-b pb-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-400 uppercase font-bold">Detalhes do Dia</p>
              <h3 className="text-base md:text-xl font-bold text-slate-800 truncate">
                {new Date(diaSelecionado + 'T12:00:00').toLocaleDateString('pt-BR', {
                  dateStyle: 'full',
                })}
              </h3>
            </div>
            <Button
              onClick={() => setIsModalOpen(true)}
              size="sm"
              icon={Plus}
              className="h-12 w-12 md:h-10 md:w-10 p-0 rounded-full flex items-center justify-center shrink-0"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {eventosDoDia.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center text-slate-400 mt-10 space-y-4">
                <CalendarIcon className="w-16 h-16 text-slate-300" />
                <p className="italic">Nenhum compromisso agendado.</p>
                <Button onClick={() => setIsModalOpen(true)} icon={Plus} size="sm" className="mt-2">
                  Adicionar Tarefa
                </Button>
              </div>
            ) : (
              eventosDoDia.map((evento) => (
                <div
                  key={evento.id}
                  className={`p-3 md:p-3 rounded-lg border flex gap-3 items-start group ${evento.status === 'concluido' ? 'opacity-60 bg-slate-50' : 'bg-white'}`}
                >
                  {/* Ícone do Tipo */}
                  <div className={`p-2 md:p-2 rounded-md mt-1 ${getCorTipo(evento.tipo)} shrink-0`}>
                    {getIconeTipo(evento.tipo)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm md:text-sm font-bold ${evento.status === 'concluido' ? 'line-through text-slate-500' : 'text-slate-800'}`}
                    >
                      {evento.titulo}
                    </p>
                    {evento.detalhe && (
                      <p className="text-xs text-slate-500 mt-1">{evento.detalhe}</p>
                    )}

                    {/* Badge de Origem */}
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {evento.origem === 'sistema' ? 'Automático' : 'Manual'}
                      </span>
                    </div>
                  </div>

                  {/* Ações (Só para manuais) */}
                  {evento.origem === 'manual' && (
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={() =>
                          concluirTarefaManual(evento.id, evento.status === 'concluido')
                        }
                        className={`p-2 md:p-1 rounded hover:bg-slate-100 active:scale-95 transition-transform ${evento.status === 'concluido' ? 'text-green-600' : 'text-slate-300'}`}
                        aria-label={
                          evento.status === 'concluido'
                            ? 'Marcar como pendente'
                            : 'Marcar como concluído'
                        }
                      >
                        <CheckCircle size={20} className="md:w-[18px] md:h-[18px]" />
                      </button>
                      <button
                        onClick={() => excluirTarefa(evento.id)}
                        className="p-2 md:p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100 transition-all active:scale-95"
                        aria-label="Excluir tarefa"
                      >
                        <Trash2 size={20} className="md:w-[18px] md:h-[18px]" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal Nova Tarefa */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Agendamento">
        <div className="p-4 md:p-4 space-y-4">
          <InputField
            label="Título da Tarefa"
            placeholder="Ex: Pagar Aluguel"
            value={novaTarefa.titulo}
            onChange={(e: any) => setNovaTarefa({ ...novaTarefa, titulo: e.target.value })}
            className="text-base"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Tipo</label>
              <select
                className="w-full border border-slate-300 p-3 md:p-2 rounded-lg bg-white text-base focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                value={novaTarefa.tipo}
                onChange={(e) => setNovaTarefa({ ...novaTarefa, tipo: e.target.value as any })}
              >
                <option value="outros">Geral</option>
                <option value="financeiro">Financeiro</option>
                <option value="manutencao">Manutenção</option>
                <option value="compras">Compras</option>
              </select>
            </div>
            <InputField
              label="Horário"
              type="time"
              value={novaTarefa.horario}
              onChange={(e: any) => setNovaTarefa({ ...novaTarefa, horario: e.target.value })}
              className="text-base"
            />
          </div>

          <div className="flex flex-col-reverse md:flex-row justify-end gap-2 md:gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              className="w-full md:w-auto min-h-[44px]"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => salvarTarefa().catch(console.error)}
              className="w-full md:w-auto min-h-[44px]"
            >
              Salvar na Agenda
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Confirmação de Exclusão */}
      <Modal
        isOpen={isConfirmDeleteOpen}
        onClose={() => {
          setIsConfirmDeleteOpen(false);
          setTarefaParaExcluir(null);
        }}
        title="Confirmar Exclusão"
      >
        <div className="p-4 md:p-4 space-y-4">
          <p className="text-slate-700">Tem certeza que deseja excluir esta tarefa?</p>
          <p className="text-sm text-slate-500">Esta ação não pode ser desfeita.</p>

          <div className="flex flex-col-reverse md:flex-row justify-end gap-2 md:gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsConfirmDeleteOpen(false);
                setTarefaParaExcluir(null);
              }}
              className="w-full md:w-auto min-h-[44px]"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmarExclusao}
              className="w-full md:w-auto min-h-[44px] bg-red-600 hover:bg-red-700"
            >
              Excluir Tarefa
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
