'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Button from '@/components/Button';
import { Plus, Eye, Edit, FileText, Loader2 } from 'lucide-react';
import { useTableFilters } from '@/hooks/useTableFilters';
import TableControls from '@/components/ui/TableControls';
import EmptyState from '@/components/ui/EmptyState';

interface FichaTecnicaRaw {
  id: string;
  produto_final: { nome: string } | { nome: string }[];
  created_at: string;
}

interface FichaTecnica {
  id: string;
  produto_final: {
    nome: string;
  };
  created_at: string;
}

export default function FichasTecnicasPage() {
  const router = useRouter();
  const [fichas, setFichas] = useState<FichaTecnica[]>([]);
  const [loading, setLoading] = useState(true);

  const { searchTerm, setSearchTerm, filteredItems } = useTableFilters(fichas, [
    'produto_final.nome',
  ]);

  useEffect(() => {
    void loadFichasTecnicas();
  }, []);

  async function loadFichasTecnicas() {
    try {
      const { data, error } = await supabase
        .from('fichas_tecnicas')
        .select(
          `
          id,
          produto_final:produtos_finais(nome),
          created_at
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transformar os dados para o formato correto
      const fichasFormatadas = (data || []).map((ficha: FichaTecnicaRaw) => ({
        ...ficha,
        produto_final: Array.isArray(ficha.produto_final)
          ? ficha.produto_final[0]
          : ficha.produto_final,
      }));

      setFichas(fichasFormatadas);
    } catch (err) {
      console.error('Erro ao carregar fichas técnicas:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fichas Técnicas</h1>
          <p className="text-gray-600">Gerenciamento das fichas técnicas de produtos finais</p>
        </div>
        <Button onClick={() => router.push('/dashboard/producao/fichas-tecnicas/nova')}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Ficha Técnica
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <TableControls
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar fichas por produto..."
        />{' '}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Carregando fichas técnicas...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={
              fichas.length === 0 ? 'Nenhuma ficha técnica cadastrada' : 'Nenhuma ficha encontrada'
            }
            description={
              fichas.length === 0
                ? 'As fichas técnicas definem as receitas e custos para produzir seus produtos finais.'
                : 'Tente ajustar os filtros de busca para encontrar o que procura.'
            }
            action={
              fichas.length === 0
                ? {
                    label: 'Criar primeira ficha técnica',
                    onClick: () => router.push('/dashboard/producao/fichas-tecnicas/nova'),
                  }
                : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produto Final
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Criado em
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((ficha) => (
                  <tr key={ficha.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {ficha.produto_final?.nome || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(ficha.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() =>
                            (window.location.href = `/dashboard/producao/fichas-tecnicas/${ficha.id}`)
                          }
                          className="inline-flex items-center justify-center w-8 h-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          aria-label={`Visualizar ficha técnica de ${ficha.produto_final?.nome || 'produto'}`}
                          title="Visualizar"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() =>
                            (window.location.href = `/dashboard/producao/fichas-tecnicas/${ficha.id}/editar`)
                          }
                          className="inline-flex items-center justify-center w-8 h-8 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
                          aria-label={`Editar ficha técnica de ${ficha.produto_final?.nome || 'produto'}`}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
