'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Button from '@/components/Button';
import { Plus, Eye, Edit, Loader2, FileText } from 'lucide-react';
import TableControls from '@/components/ui/TableControls';
import EmptyState from '@/components/ui/EmptyState';
import PageHeader from '@/components/ui/PageHeader';

interface FichaTecnicaRaw {
  id: string;
  nome?: string;
  produto_final: { nome: string } | { nome: string }[];
  created_at: string;
}

interface FichaTecnica {
  id: string;
  slug: string;
  ativo: boolean;
  nome?: string;
  produto_final: {
    nome: string;
  };
  created_at: string;
}

function normalizeFichaNome(ficha: FichaTecnica) {
  return ficha.produto_final && ficha.produto_final.nome
    ? ficha.produto_final.nome.toString().toLowerCase()
    : '';
}

export default function FichasTecnicasPage() {
  const router = useRouter();
  const [fichas, setFichas] = useState<FichaTecnica[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativos' | 'inativos'>('todos');

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
          slug,
          produto_final:produtos_finais!fk_produto_final(nome),
          created_at,
          ativo
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transformar os dados para o formato correto
      const fichasFormatadas = (data || []).map((ficha: any) => ({
        ...ficha,
        produto_final: Array.isArray(ficha.produto_final)
          ? ficha.produto_final[0]
          : ficha.produto_final,
      }));

      setFichas(fichasFormatadas);
    } catch (err) {
      console.error('Erro ao carregar fichas técnicas:', JSON.stringify(err, null, 2));
    } finally {
      setLoading(false);
    }
  }

  // Filtro manual corrigido para busca e status
  const filteredItems = fichas.filter((ficha) => {
    // Filtro de status
    if (statusFilter === 'ativos' && ficha.ativo === false) return false;
    if (statusFilter === 'inativos' && ficha.ativo !== false) return false;
    // Filtro de busca
    if (!searchTerm || searchTerm.trim() === '') return true;
    // Busca pelo nome do produto final
    return normalizeFichaNome(ficha).includes(searchTerm.trim().toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Fichas Técnicas"
        description="Gerenciamento das fichas técnicas de produtos finais"
        icon={FileText}
      >
        <Button onClick={() => router.push('/dashboard/producao/fichas-tecnicas/nova')}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Ficha Técnica
        </Button>
      </PageHeader>

      {/* Filtro de status */}
      <div className="mb-4 flex gap-2">
        <button
          className={`px-3 py-1 rounded ${statusFilter === 'todos' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          onClick={() => setStatusFilter('todos')}
        >
          Todos
        </button>
        <button
          className={`px-3 py-1 rounded ${statusFilter === 'ativos' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          onClick={() => setStatusFilter('ativos')}
        >
          Ativos
        </button>
        <button
          className={`px-3 py-1 rounded ${statusFilter === 'inativos' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          onClick={() => setStatusFilter('inativos')}
        >
          Inativos
        </button>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <TableControls
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar fichas por produto..."
        />{' '}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Carregando fichas técnicas...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            type={fichas.length === 0 ? 'no-data' : 'no-results'}
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
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Produto Final
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Criado em
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredItems.map((ficha) => (
                  <tr key={ficha.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {ficha.produto_final?.nome || 'N/A'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {ficha.ativo === false ? 'Inativo' : 'Ativo'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(ficha.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() =>
                            (window.location.href = `/dashboard/producao/fichas-tecnicas/${ficha.slug}/view`)
                          }
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-blue-600 transition-colors duration-200 hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          aria-label={`Visualizar ficha técnica de ${ficha.produto_final?.nome || 'produto'}`}
                          title="Visualizar"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() =>
                            (window.location.href = `/dashboard/producao/fichas-tecnicas/${ficha.slug}/edit`)
                          }
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-yellow-600 transition-colors duration-200 hover:bg-yellow-50 hover:text-yellow-800 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
                          aria-label={`Editar ficha técnica de ${ficha.produto_final?.nome || 'produto'}`}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (
                              window.confirm('Tem certeza que deseja excluir esta ficha técnica?')
                            ) {
                              await supabase
                                .from('fichas_tecnicas')
                                .delete()
                                .eq('slug', ficha.slug);
                              window.location.reload();
                            }
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-600 transition-colors duration-200 hover:bg-red-50 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                          aria-label={`Excluir ficha técnica de ${ficha.produto_final?.nome || 'produto'}`}
                          title="Excluir"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
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
