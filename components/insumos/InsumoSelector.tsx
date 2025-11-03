'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Text from '@/components/ui/Text';

import Button from '@/components/Button';
import Panel from '@/components/ui/Panel';
import { Insumo } from '@/lib/types/insumos';

export interface InsumoSelectorProps {
  onSelect: (insumo: Insumo, quantidade: number) => void;
}

export default function InsumoSelector({ onSelect }: InsumoSelectorProps) {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [busca, setBusca] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [insumoSelecionado, setInsumoSelecionado] = useState<Insumo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (!busca) {
      setInsumos([]);
      return;
    }

    const buscarInsumos = async () => {
      setCarregando(true);
      try {
        const { data, error } = await supabase
          .from('insumos')
          .select('*')
          .ilike('nome', `%${busca}%`)
          .limit(10);

        if (error) throw error;
        setInsumos(data || []);
      } catch (err) {
        console.error('Erro ao buscar insumos:', err);
      } finally {
        setCarregando(false);
      }
    };

    void buscarInsumos();
  }, [busca, supabase]);

  const handleSubmit = () => {
    if (insumoSelecionado && quantidade > 0) {
      onSelect(insumoSelecionado, quantidade);
      setBusca('');
      setQuantidade(1);
      setInsumoSelecionado(null);
    }
  };

  return (
    <Panel className="space-y-4">
      <div>
        <Text variant="h4">Buscar Insumo</Text>
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Digite o nome do insumo..."
          className="w-full p-2 border rounded-md"
        />
      </div>

      {carregando ? (
        <Text>Buscando insumos...</Text>
      ) : insumos.length > 0 ? (
        <div className="space-y-2">
          {insumos.map((insumo) => (
            <button
              key={insumo.id}
              onClick={() => setInsumoSelecionado(insumo)}
              className={`w-full p-2 text-left rounded-md hover:bg-gray-100 ${
                insumoSelecionado?.id === insumo.id ? 'bg-blue-50 border-blue-500' : ''
              }`}
            >
              <Text>{insumo.nome}</Text>
              <Text className="text-sm text-gray-500">
                Unidade: {insumo.unidade_medida}
                {insumo.ultimo_valor && ` | Último valor: R$ ${insumo.ultimo_valor.toFixed(2)}`}
              </Text>
            </button>
          ))}
        </div>
      ) : (
        busca && <Text className="text-gray-500">Nenhum insumo encontrado</Text>
      )}

      {insumoSelecionado && (
        <div>
          <Text variant="h4">Quantidade</Text>
          <div className="flex items-center space-x-4">
            <input
              type="number"
              value={quantidade}
              onChange={(e) => setQuantidade(Math.max(1, Number(e.target.value)))}
              min="1"
              className="w-24 p-2 border rounded-md"
            />
            <Text>{insumoSelecionado.unidade_medida}</Text>
          </div>

          <Button variant="primary" onClick={handleSubmit} className="mt-4 w-full">
            Adicionar ao Pedido
          </Button>
        </div>
      )}
    </Panel>
  );
}
