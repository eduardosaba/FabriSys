'use client';

import { useState, useEffect } from 'react';
import { getLocalDateISOString } from '@/lib/utils';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth';
import { PDVKanbanView } from '@/components/acerto-diario/PDVKanbanView';
import { RefreshCw } from 'lucide-react';

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

export default function AcertoDiarioPage() {
  const { profile } = useAuth();

  const [locais, setLocais] = useState<LocalPDV[]>([]);
  const [produtosBase, setProdutosBase] = useState<ProdutoItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [dataAcerto, setDataAcerto] = useState<string>(() => getLocalDateISOString());

  useEffect(() => {
    async function carregarDadosIniciais() {
      if (!profile?.organization_id) return;

      setLoading(true);
      try {
        // 1. Carregar PDVs (excluindo Fábrica)
        let queryLocais = supabase.from('locais').select('id, nome, tipo, logo_url, ordem');
        queryLocais = queryLocais.eq('organization_id', profile.organization_id);

        const { data: dataLocaisRaw, error: errorLocais } = await queryLocais
          .order('ordem', { ascending: true })
          .order('nome');

        let dataLocais = dataLocaisRaw;

        if (errorLocais && errorLocais.message?.includes('ordem')) {
          const res = await queryLocais.order('nome');
          dataLocais = res.data;
        }

        if (!dataLocais || dataLocais.length === 0) {
          const { data: fallbackLocais } = await supabase
            .from('locais')
            .select('id, nome, tipo, logo_url, ordem')
            .order('ordem', { ascending: true })
            .order('nome');
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

          setLocais(pdvsApenas.length > 0 ? pdvsApenas : dataLocais);
        }

        // 2. Carregar Produtos Base (Ativos)
        const queryProds = supabase
          .from('produtos_finais')
          .select('id, nome, preco_venda, ativo')
          .neq('ativo', false)
          .eq('organization_id', profile.organization_id)
          .order('nome');

        let { data: dataProds } = await queryProds;

        if (!dataProds || dataProds.length === 0) {
          const { data: fallbackProds } = await supabase
            .from('produtos_finais')
            .select('id, nome, preco_venda, ativo')
            .neq('ativo', false)
            .order('nome');
          dataProds = fallbackProds;
        }

        if (dataProds && dataProds.length > 0) {
          setProdutosBase(
            dataProds.map((p) => ({
              id: p.id,
              nome: p.nome,
              preco: Number(p.preco_venda) || 8.0,
            }))
          );
        } else {
          setProdutosBase([
            { id: '1', nome: 'Empada Doce', preco: 9.0 },
            { id: '2', nome: 'Empada Salgada', preco: 8.0 },
          ]);
        }
      } catch (err) {
        console.error('Erro ao inicializar Acerto Diário:', err);
      } finally {
        setLoading(false);
      }
    }

    carregarDadosIniciais();
  }, [profile?.organization_id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-3 text-text/50">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        <span className="text-sm font-bold animate-pulse">Carregando painel de acerto...</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full max-w-[1800px] mx-auto space-y-6">
      <div className="px-1">
        <h1 className="text-2xl font-black text-text flex items-center gap-2">
          Cockpit de Operações
        </h1>
        <p className="text-sm font-medium text-text/50 mt-1">
          Acompanhe os envios, sobras, fechamentos e auditorias em tempo real.
        </p>
      </div>

      <PDVKanbanView
        locais={locais}
        produtosBase={produtosBase}
        profile={profile}
        dataAcerto={dataAcerto}
        onDataChange={setDataAcerto}
      />
    </div>
  );
}
