'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Button from '@/components/Button';
import { Plus, Eye, Edit, FileText } from 'lucide-react';

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
  const [fichas, setFichas] = useState<FichaTecnica[]>([]);
  const [loading, setLoading] = useState(true);

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
        <Button onClick={() => (window.location.href = '/dashboard/producao/fichas-tecnicas/nova')}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Ficha Técnica
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {fichas.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Nenhuma ficha técnica cadastrada
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              As fichas técnicas definem as receitas e custos para produzir seus produtos finais.
            </p>
            <div className="mt-6">
              <Button
                onClick={() => (window.location.href = '/dashboard/producao/fichas-tecnicas/nova')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar primeira ficha técnica
              </Button>
            </div>
          </div>
        ) : (
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
              {fichas.map((ficha) => (
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
                        className="text-blue-600 hover:text-blue-900"
                        title="Visualizar"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() =>
                          (window.location.href = `/dashboard/producao/fichas-tecnicas/${ficha.id}/editar`)
                        }
                        className="text-yellow-600 hover:text-yellow-900"
                        title="Editar"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
