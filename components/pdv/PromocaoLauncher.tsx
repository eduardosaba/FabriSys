'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Tag, Plus, Minus } from 'lucide-react';

interface Promocao {
  id: string;
  nome: string;
  produto_id: string;
  produto_nome?: string;
  qtd_gatilho: number;
  preco_normal_unitario: number; // Preço do produto base
  preco_final_combo: number;
}

interface PromocaoAplicada {
  promo_id: string;
  nome: string;
  qtd_combos: number;
  desconto_total: number;
}

interface Props {
  onUpdate: (totalDesconto: number, aplicadas: PromocaoAplicada[]) => void;
}

export default function PromocaoLauncher({ onUpdate }: Props) {
  const [promocoes, setPromocoes] = useState<Promocao[]>([]);
  const [contadores, setContadores] = useState<Record<string, number>>({}); // { promo_id: qtd }

  // 1. Carregar Promoções Ativas
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('promocoes')
        .select('*')
        .eq('ativo', true);

      if (data) {
        const rows = data as any[];
        const produtoIds = Array.from(new Set(rows.map((r) => String(r.produto_id)).filter(Boolean)));
        const produtoMap: Record<string, { nome?: string; preco_venda?: number }> = {};
        if (produtoIds.length > 0) {
          const { data: produtos } = await supabase.from('produtos_finais').select('id, nome, preco_venda').in('id', produtoIds);
          (produtos || []).forEach((p: any) => (produtoMap[String(p.id)] = { nome: p.nome, preco_venda: Number(p.preco_venda || 0) }));
        }

        const formatadas = rows.map((p: any) => ({
          id: p.id,
          nome: p.nome,
          produto_id: p.produto_id,
          produto_nome: produtoMap[String(p.produto_id)]?.nome,
          qtd_gatilho: p.qtd_gatilho,
          preco_normal_unitario: Number(produtoMap[String(p.produto_id)]?.preco_venda || 0),
          preco_final_combo: Number(p.preco_final || 0),
        }));

        setPromocoes(formatadas);
      }
    }
    void load();
  }, []);

  // 2. Atualizar cálculo sempre que um contador mudar
  useEffect(() => {
    let totalDesconto = 0;
    const listaAplicada: PromocaoAplicada[] = [];

    promocoes.forEach((promo) => {
      const qtd = contadores[promo.id] || 0;
      if (qtd > 0) {
        const precoNormalTotal = promo.preco_normal_unitario * promo.qtd_gatilho * qtd;
        const precoPromoTotal = promo.preco_final_combo * qtd;
        const desconto = precoNormalTotal - precoPromoTotal;

        totalDesconto += desconto;
        listaAplicada.push({
          promo_id: promo.id,
          nome: promo.nome,
          qtd_combos: qtd,
          desconto_total: desconto,
        });
      }
    });

    onUpdate(totalDesconto, listaAplicada);
  }, [contadores, promocoes, onUpdate]);

  const changeQtd = (id: string, delta: number) => {
    setContadores((prev) => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + delta),
    }));
  };

  if (promocoes.length === 0) return null;

  return (
    <div className="bg-pink-50 p-4 rounded-xl border border-pink-100">
      <h4 className="font-bold text-pink-800 flex items-center gap-2 mb-3 text-sm">
        <Tag size={16} /> Promoções Realizadas
      </h4>
      <p className="text-xs text-pink-600 mb-3">
        Informe quantos combos foram vendidos para justificar a diferença de caixa.
      </p>

      <div className="space-y-2">
        {promocoes.map((promo) => (
          <div
            key={promo.id}
            className="flex items-center justify-between bg-white p-2 rounded border border-pink-100 shadow-sm"
          >
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-700">{promo.nome}</p>
              <p className="text-[10px] text-slate-400">
                {promo.qtd_gatilho}x {promo.produto_nome}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => changeQtd(promo.id, -1)}
                className="p-1 bg-slate-100 rounded hover:bg-slate-200 text-slate-600"
              >
                <Minus size={14} />
              </button>
              <span className="font-bold w-6 text-center text-sm">{contadores[promo.id] || 0}</span>
              <button
                onClick={() => changeQtd(promo.id, 1)}
                className="p-1 bg-pink-100 rounded hover:bg-pink-200 text-pink-600"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
