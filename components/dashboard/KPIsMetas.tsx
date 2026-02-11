'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Store, TrendingUp, AlertCircle } from 'lucide-react';

interface MetaLoja {
  id: string;
  nome: string;
  meta: number;
  vendas: number;
  percentual: number;
}

export default function KPIsMetas() {
  const [dados, setDados] = useState<MetaLoja[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarDados() {
      try {
        setLoading(true);

        // 1. Buscar Lojas Ativas
        const { data: locais, error: errLocais } = await supabase
          .from('locais')
          .select('id, nome')
          .eq('tipo', 'pdv')
          .eq('ativo', true);

        if (errLocais) throw errLocais;
        if (!locais || locais.length === 0) {
          setDados([]);
          return;
        }

        const dataHoje = new Date().toISOString().split('T')[0];
        const inicioDia = `${dataHoje}T00:00:00.000Z`;
        const fimDia = `${dataHoje}T23:59:59.999Z`;

        const resultados = await Promise.all(
          locais.map(async (loja) => {
            // 2. Buscar Meta (usa maybeSingle para não dar erro 406 se não existir)
            const { data: metaData } = await supabase
              .from('metas_vendas')
              .select('valor_meta')
              .eq('local_id', loja.id)
              .eq('data_referencia', dataHoje)
              .maybeSingle();

            const valorMeta = Number(metaData?.valor_meta || 0);

            // 3. Buscar Vendas (CORREÇÃO: usa 'valor_total')
            const { data: vendasData } = await supabase
              .from('vendas')
              .select('valor_total') // <--- NOME CORRIGIDO AQUI
              .eq('local_id', loja.id)
              .gte('created_at', inicioDia)
              .lte('created_at', fimDia);

            const totalVendas = (vendasData || []).reduce(
              (acc, v) => acc + Number(v.valor_total || 0), // <--- NOME CORRIGIDO AQUI
              0
            );

            return {
              id: loja.id,
              nome: loja.nome,
              meta: valorMeta,
              vendas: totalVendas,
              percentual: valorMeta > 0 ? (totalVendas / valorMeta) * 100 : 0,
            };
          })
        );

        setDados(resultados);
      } catch (err) {
        console.error('Erro ao carregar KPIs:', err);
      } finally {
        setLoading(false);
      }
    }

    void carregarDados();
  }, []);

  if (loading) return <div className="h-40 bg-slate-100 rounded-xl animate-pulse"></div>;
  if (dados.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Store size={20} className="text-blue-600" /> Desempenho por Loja (Hoje)
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dados.map((loja) => (
          <div key={loja.id} className="p-4 border border-slate-100 rounded-lg bg-slate-50">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-slate-700 truncate">{loja.nome}</span>
              <span
                className={`text-xs font-bold px-2 py-1 rounded-full ${loja.percentual >= 100 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}
              >
                {loja.percentual.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-end gap-1 mb-2">
              <span className="text-2xl font-bold text-slate-800">
                R$ {loja.vendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-slate-400 mb-1">
                / {loja.meta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${loja.percentual >= 100 ? 'bg-green-500' : loja.percentual >= 50 ? 'bg-blue-500' : 'bg-orange-400'}`}
                style={{ width: `${Math.min(loja.percentual, 100)}%` }}
              ></div>
            </div>
            {loja.meta === 0 && (
              <p className="text-[10px] text-orange-500 mt-2 flex items-center gap-1">
                <AlertCircle size={10} /> Meta não definida
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
