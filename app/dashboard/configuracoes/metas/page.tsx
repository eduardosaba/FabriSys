'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/Button';
import Loading from '@/components/ui/Loading';
import { Target, Save, TrendingUp } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';

export default function GestaoMetasPage() {
  const [locais, setLocais] = useState<any[]>([]);
  const [localSelecionado, setLocalSelecionado] = useState('');
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [monthlyMetaByLocal, setMonthlyMetaByLocal] = useState<Record<string, number>>({});
  const [editingLocalId, setEditingLocalId] = useState<string | null>(null);
  const [editingLocalValor, setEditingLocalValor] = useState<string>('');
  const [savedStatus, setSavedStatus] = useState<
    Record<string, 'saved' | 'saving' | 'error' | undefined>
  >({});
  const confirmDialog = useConfirm();
  const [metaMensal, setMetaMensal] = useState<string>('');
  const [metaMensalDisplay, setMetaMensalDisplay] = useState<string>('');
  const [metasDiarias, setMetasDiarias] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  // dias selecionados (0=Dom,1=Seg,...6=Sab) — por padrão todos selecionados
  const [weekdays, setWeekdays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  const toggleWeekday = (d: number) => {
    setWeekdays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  const currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  const formatBRL = (v: number) => currencyFormatter.format(Number(v) || 0);

  const parseBRL = (s: string) => {
    if (!s) return 0;
    // Remove everything except digits, comma and dot, then normalize
    const cleaned = String(s)
      .replace(/[^\d,.-]/g, '')
      .replace(/\.(?=\d{3,})/g, '');
    const normalized = cleaned.replace(',', '.');
    const n = parseFloat(normalized);
    return Number.isFinite(n) ? n : 0;
  };

  const parseISOToLocal = (s: string) => {
    // espera 'YYYY-MM-DD' e cria Date no timezone local sem alterar o dia
    const parts = String(s).split('-');
    if (parts.length < 3) return new Date(s);
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d);
  };

  useEffect(() => {
    void supabase
      .from('locais')
      .select('id, nome')
      .eq('tipo', 'pdv')
      .then(({ data }) => {
        setLocais(data || []);
        if (data?.[0]) setLocalSelecionado(data[0].id);
      });
  }, []);

  useEffect(() => {
    // calcular metas mensais por local para o mês selecionado
    const loadMonthlyMetas = async () => {
      const [ano, mesNum] = mes.split('-');
      const dias = new Date(parseInt(ano), parseInt(mesNum), 0).getDate();
      const start = `${mes}-01`;
      const end = `${mes}-${String(dias).padStart(2, '0')}`;

      const { data: metas } = await supabase
        .from('metas_vendas')
        .select('local_id, valor_meta')
        .gte('data_referencia', start)
        .lte('data_referencia', end);

      const grouping: Record<string, number> = {};
      (metas || []).forEach((m: any) => {
        grouping[m.local_id] = (grouping[m.local_id] || 0) + Number(m.valor_meta || 0);
      });
      setMonthlyMetaByLocal(grouping);
    };

    void loadMonthlyMetas();
  }, [mes]);

  const carregarOuGerarMetas = useCallback(async () => {
    if (!localSelecionado) return;
    setLoading(true);

    const [ano, mesNum] = mes.split('-');
    const diasNoMes = new Date(parseInt(ano), parseInt(mesNum), 0).getDate();

    const { data: existentes } = await supabase
      .from('metas_vendas')
      .select('*')
      .eq('local_id', localSelecionado)
      .gte('data_referencia', `${mes}-01`)
      .lte('data_referencia', `${mes}-${diasNoMes}`);

    const lista = [];
    for (let d = 1; d <= diasNoMes; d++) {
      const dataStr = `${mes}-${String(d).padStart(2, '0')}`;
      const salvo = existentes?.find((m) => m.data_referencia === dataStr);

      lista.push({
        data: dataStr,
        valor: salvo ? salvo.valor_meta : 0,
        id: salvo?.id,
      });
    }
    setMetasDiarias(lista);
    setLoading(false);
  }, [localSelecionado, mes]);

  useEffect(() => {
    void carregarOuGerarMetas();
  }, [localSelecionado, mes, carregarOuGerarMetas]);

  const [diasNoMes, setDiasNoMes] = useState<number>(() => {
    const [ano, mesNum] = mes.split('-');
    return new Date(parseInt(ano), parseInt(mesNum), 0).getDate();
  });

  useEffect(() => {
    const [ano, mesNum] = mes.split('-');
    const d = new Date(parseInt(ano), parseInt(mesNum), 0).getDate();
    setDiasNoMes(d);
  }, [mes]);

  const distribuirMeta = () => {
    const valor = parseBRL(metaMensal) || 0;
    if (Number.isNaN(valor) || valor < 0) return toast.error('Valor inválido');

    // filtrar apenas os dias ativos conforme seleção do admin
    const activeDays = metasDiarias.filter((m) =>
      weekdays.includes(parseISOToLocal(m.data).getDay())
    );
    if (!activeDays || activeDays.length === 0)
      return toast.error('Selecione ao menos um dia de funcionamento');

    const diario = valor / activeDays.length;

    const novaLista = metasDiarias.map((m) => ({
      ...m,
      valor: weekdays.includes(parseISOToLocal(m.data).getDay()) ? diario : m.valor,
    }));
    setMetasDiarias(novaLista);
    toast.success('Valor distribuído! Clique em Salvar para confirmar.');
  };

  const salvarMetas = async () => {
    setLoading(true);
    try {
      const upserts = metasDiarias.map((m) => ({
        local_id: localSelecionado,
        data_referencia: m.data,
        valor_meta: m.valor,
      }));

      const { error } = await supabase
        .from('metas_vendas')
        .upsert(upserts, { onConflict: 'local_id, data_referencia' });

      if (error) throw error;
      toast.success('Metas salvas com sucesso!');
      // atualizar soma local
      void (async () => {
        const [ano, mesNum] = mes.split('-');
        const dias = new Date(parseInt(ano), parseInt(mesNum), 0).getDate();
        const start = `${mes}-01`;
        const end = `${mes}-${String(dias).padStart(2, '0')}`;
        const { data: metas } = await supabase
          .from('metas_vendas')
          .select('local_id, valor_meta')
          .eq('local_id', localSelecionado)
          .gte('data_referencia', start)
          .lte('data_referencia', end);
        const total = (metas || []).reduce((s: number, x: any) => s + Number(x.valor_meta || 0), 0);
        setMonthlyMetaByLocal((prev) => ({ ...prev, [localSelecionado]: total }));
        setSavedStatus((s) => ({ ...s, [localSelecionado]: 'saved' }));
        setTimeout(() => setSavedStatus((s) => ({ ...s, [localSelecionado]: undefined })), 3000);
      })();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  const abrirEdicaoLocal = (localId: string) => {
    setEditingLocalId(localId);
    setEditingLocalValor(String(monthlyMetaByLocal[localId] || ''));
  };

  const fecharEdicaoLocal = () => {
    setEditingLocalId(null);
    setEditingLocalValor('');
  };

  const salvarMetaLocal = async () => {
    if (!editingLocalId) return;
    setSavedStatus((s) => ({ ...s, [editingLocalId]: 'saving' }));
    try {
      // calcular distribuição diária para o mês conforme dias ativos (weekdays)
      const [ano, mesNum] = mes.split('-');
      const dias = new Date(parseInt(ano), parseInt(mesNum), 0).getDate();
      const daysList: number[] = [];
      for (let d = 1; d <= dias; d++) {
        const dt = new Date(parseInt(ano), parseInt(mesNum) - 1, d);
        if (weekdays.includes(dt.getDay())) daysList.push(d);
      }
      const mensal = Number(editingLocalValor) || 0;
      const diario = daysList.length > 0 ? mensal / daysList.length : 0;

      const upserts = [] as any[];
      for (let d = 1; d <= dias; d++) {
        const dataStr = `${mes}-${String(d).padStart(2, '0')}`;
        const valor = daysList.includes(d) ? Number(Number(diario.toFixed(2))) : 0;
        upserts.push({ local_id: editingLocalId, data_referencia: dataStr, valor_meta: valor });
      }

      const { error } = await supabase
        .from('metas_vendas')
        .upsert(upserts, { onConflict: 'local_id,data_referencia' });
      if (error) throw error;

      // atualizar soma local
      setMonthlyMetaByLocal((prev) => ({ ...prev, [editingLocalId]: mensal }));
      setSavedStatus((s) => ({ ...s, [editingLocalId]: 'saved' }));
      setTimeout(() => setSavedStatus((s) => ({ ...s, [editingLocalId]: undefined })), 3000);

      // se o PDV editado for o selecionado, atualizar metasDiarias exibidas
      if (editingLocalId === localSelecionado) {
        const novaLista = metasDiarias.map((m) => {
          const d = parseInt(m.data.split('-')[2], 10);
          return { ...m, valor: daysList.includes(d) ? Number(Number(diario.toFixed(2))) : 0 };
        });
        setMetasDiarias(novaLista);
      }

      fecharEdicaoLocal();
      toast.success('Meta mensal atualizada e metas diárias redistribuídas');
    } catch (err) {
      console.error(err);
      setSavedStatus((s) => ({ ...s, [editingLocalId]: 'error' }));
      toast.error('Erro ao salvar meta');
    }
  };

  const excluirMetaLocal = async (localId: string) => {
    const confirmed = await confirmDialog.confirm({
      title: 'Excluir Metas',
      message: 'Excluir metas deste PDV para o mês selecionado? Esta ação não pode ser desfeita.',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      const [ano, mesNum] = mes.split('-');
      const dias = new Date(parseInt(ano), parseInt(mesNum), 0).getDate();
      const start = `${mes}-01`;
      const end = `${mes}-${String(dias).padStart(2, '0')}`;
      const { error } = await supabase
        .from('metas_vendas')
        .delete()
        .eq('local_id', localId)
        .gte('data_referencia', start)
        .lte('data_referencia', end);
      if (error) throw error;
      setMonthlyMetaByLocal((prev) => ({ ...prev, [localId]: 0 }));
      if (localSelecionado === localId) {
        // zerar metasDiarias exibidas
        const novaLista = metasDiarias.map((m) => ({ ...m, valor: 0 }));
        setMetasDiarias(novaLista);
      }
      toast.success('Metas excluídas');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir metas');
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-up">
      <PageHeader
        title="Gestão de Metas Comerciais"
        description="Defina os objetivos de venda diários para cada loja."
        icon={Target}
      />

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-sm font-bold text-slate-700 block mb-1">Loja / PDV</label>
          <select
            className="p-2 border rounded-lg bg-slate-50 min-w-[200px]"
            value={localSelecionado}
            onChange={(e) => setLocalSelecionado(e.target.value)}
          >
            {locais.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700 block mb-1">Mês de Referência</label>
          <input
            type="month"
            className="p-2 border rounded-lg bg-slate-50"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
          />
        </div>

        <div className="pl-4">
          <label className="text-sm font-bold text-slate-700 block mb-1">
            Dias de Funcionamento
          </label>
          <div className="flex gap-1">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((label, idx) => {
              const selected = weekdays.includes(idx);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleWeekday(idx)}
                  className={`text-xs px-2 py-1 rounded ${selected ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-700'} border border-slate-200`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="ml-4 text-sm text-slate-500">
          <div>
            Dias no mês: <strong className="text-slate-700">{diasNoMes}</strong>
          </div>
          <div>
            Dias selecionados:{' '}
            <strong className="text-slate-700">
              {
                metasDiarias.filter((m) => weekdays.includes(parseISOToLocal(m.data).getDay()))
                  .length
              }
            </strong>
          </div>
        </div>

        <div className="pl-4 border-l border-slate-200">
          <label className="text-sm font-bold text-blue-700 block mb-1">
            Definir Meta Mensal (R$)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              className="p-2 border rounded-lg w-40 text-right"
              placeholder="R$ 0,00"
              value={metaMensalDisplay}
              onChange={(e) => {
                const v = e.target.value;
                setMetaMensalDisplay(v);
                setMetaMensal(v);
              }}
              onBlur={() => {
                const num = parseBRL(metaMensal);
                setMetaMensalDisplay(formatBRL(num));
              }}
              onFocus={() => {
                // quando focar, mostrar o valor cru para edição
                if (metaMensal) setMetaMensalDisplay(metaMensal);
              }}
            />
            <Button onClick={distribuirMeta} variant="secondary" icon={TrendingUp}>
              Distribuir
            </Button>
          </div>
        </div>

        <div className="ml-auto">
          <Button onClick={salvarMetas} icon={Save} loading={loading}>
            Salvar Alterações
          </Button>
        </div>
      </div>

      {/* Lista de PDVs com ações por PDV */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <h4 className="text-sm font-bold mb-3">Metas Mensais por PDV — {mes}</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {locais.map((l) => (
            <div key={l.id} className="flex items-center justify-between p-2 border rounded">
              <div>
                <div className="text-sm font-bold">{l.nome}</div>
                <div className="text-xs text-slate-500">
                  R$ {(monthlyMetaByLocal[l.id] || 0).toFixed(2)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => abrirEdicaoLocal(l.id)}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                >
                  Editar
                </button>
                <button
                  onClick={() => excluirMetaLocal(l.id)}
                  className="px-3 py-1 border rounded text-sm"
                >
                  Excluir
                </button>
                <div className="text-xs ml-2">
                  {savedStatus[l.id] === 'saving'
                    ? 'Salvando...'
                    : savedStatus[l.id] === 'saved'
                      ? 'Salvo'
                      : savedStatus[l.id] === 'error'
                        ? 'Erro'
                        : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingLocalId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h4 className="text-lg font-bold mb-3">Editar Meta Mensal</h4>
            <div className="mb-3">
              <label className="text-sm text-slate-600">Valor da Meta (mensal)</label>
              <input
                type="number"
                value={editingLocalValor}
                onChange={(e) => setEditingLocalValor(e.target.value)}
                className="w-full mt-2 p-2 border rounded"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={fecharEdicaoLocal} className="px-3 py-2 rounded border">
                Cancelar
              </button>
              <button
                onClick={salvarMetaLocal}
                className="px-3 py-2 rounded bg-blue-600 text-white"
              >
                Salvar Meta
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <Loading />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {metasDiarias.map((meta, idx) => (
            <div
              key={idx}
              className="bg-white p-3 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors"
            >
              {(() => {
                const dt = parseISOToLocal(meta.data);
                const dia = dt.toLocaleDateString('pt-BR', { day: '2-digit' });
                const weekday = dt.toLocaleDateString('pt-BR', { weekday: 'short' });
                const isOpen = weekdays.includes(dt.getDay());
                return (
                  <>
                    <span
                      className={`text-xs font-bold block mb-1 ${isOpen ? 'text-slate-500' : 'text-slate-400'}`}
                    >
                      {dia} • {weekday}
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        className={`w-full text-sm font-bold outline-none border-b border-transparent focus:border-blue-500 bg-transparent text-right ${isOpen ? 'text-slate-700' : 'text-slate-400 opacity-60'}`}
                        value={formatBRL(meta.valor)}
                        disabled={!isOpen}
                        onChange={(e) => {
                          const novo = [...metasDiarias];
                          novo[idx].valor = parseBRL(e.target.value);
                          setMetasDiarias(novo);
                        }}
                      />
                    </div>
                  </>
                );
              })()}
            </div>
          ))}
        </div>
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
    </div>
  );
}
