'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/Button';
import Loading from '@/components/ui/Loading';
import { Target, Save, TrendingUp } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function GestaoMetasPage() {
  const [locais, setLocais] = useState<any[]>([]);
  const [localSelecionado, setLocalSelecionado] = useState('');
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
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
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar');
    } finally {
      setLoading(false);
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
    </div>
  );
}
