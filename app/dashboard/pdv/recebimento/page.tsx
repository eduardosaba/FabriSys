'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import Loading from '@/components/ui/Loading';
import { Truck, CheckCircle, Package, MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Button from '@/components/Button';

export default function RecebimentoPage() {
  const [cargas, setCargas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [localId, setLocalId] = useState<string | null>(null);

  // 1. Identificar a Loja Atual (Similar ao que fizemos no Caixa)
  const carregarLocal = useCallback(async () => {
    try {
      const { data: locais } = await supabase
        .from('locais')
        .select('id, nome')
        .eq('tipo', 'pdv')
        .limit(1); // TODO: Melhorar para pegar do perfil do usuário em multi-lojas

      const meuLocal = locais?.[0];
      if (meuLocal) {
        setLocalId(meuLocal.id);
        return meuLocal.id;
      }
    } catch (err) {
      console.error('Erro ao carregar local', err);
    }
    return null;
  }, []);

  // 2. Carregar Cargas (Filtrando pela loja)
  const carregarCargas = useCallback(async (idLoja: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('distribuicao_pedidos')
        .select(
          `
          id, quantidade_solicitada, status, created_at, local_destino_id,
          local:locais(nome),
          ordem:ordens_producao(
            numero_op,
            produto:produtos_finais(nome)
          )
        `
        )
        .neq('status', 'recebido')
        .eq('local_destino_id', idLoja) // <--- CORREÇÃO DE SEGURANÇA: Filtra pela loja atual
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Normalização dos dados (mantida do seu código original)
      const norm = (data || []).map((c: any) => {
        const ordem = c.ordem;
        if (ordem && ordem.produto) {
          const prod = ordem.produto;
          ordem.produto = Array.isArray(prod) ? prod[0] : prod;
        }
        return { ...c, ordem };
      });
      setCargas(norm);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao buscar cargas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const id = await carregarLocal();
      if (id) {
        await carregarCargas(id);
      } else {
        setLoading(false);
        toast.error('Loja não identificada.');
      }
    };
    void init();
  }, [carregarLocal, carregarCargas]);

  const confirmarRecebimento = async (id: string) => {
    if (!localId) return;
    try {
      const { error } = await supabase.rpc('receber_carga_pdv', { p_distribuicao_id: id });
      if (error) throw error;

      toast.success('Estoque atualizado com sucesso!');
      void carregarCargas(localId); // Recarrega lista
    } catch (err) {
      console.error(err);
      toast.error('Erro ao receber carga.');
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-up">
      <PageHeader
        title="Recebimento de Mercadoria"
        description="Confirme a entrada dos produtos enviados pela Fábrica."
        icon={Truck}
      />

      {cargas.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-xl border border-dashed border-slate-300">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">Tudo recebido!</h3>
          <p className="text-slate-500">Não há entregas pendentes para esta loja no momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cargas.map((carga) => (
            <div
              key={carga.id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                    <Package size={12} /> OP #{carga.ordem?.numero_op}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(carga.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                <h3 className="font-bold text-lg text-slate-800 mb-1">
                  {carga.ordem?.produto?.nome}
                </h3>

                <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                  <MapPin size={14} /> Destino: {carga.local?.nome}
                </div>

                <div className="bg-slate-50 p-3 rounded-lg mb-4 text-center border border-slate-100">
                  <span className="block text-xs text-slate-500 uppercase">Quantidade</span>
                  <span className="text-2xl font-bold text-slate-800">
                    {carga.quantidade_solicitada} un
                  </span>
                </div>
              </div>

              <Button
                onClick={() => confirmarRecebimento(carga.id)}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                icon={CheckCircle}
              >
                Confirmar Entrada
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
