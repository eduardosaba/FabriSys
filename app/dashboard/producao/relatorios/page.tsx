'use client';

import Button from '@/components/Button';
import { FileText, Download, Calendar, TrendingUp, BarChart3 } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';

export default function RelatoriosProducaoPage() {
  const reportTypes = [
    {
      id: 'ordens-producao',
      title: 'Ordens de Produção',
      description: 'Relatório completo de todas as ordens de produção',
      icon: <FileText className="h-6 w-6" />,
    },
    {
      id: 'produtos-finais',
      title: 'Produtos Finais',
      description: 'Relatório de produtos finais cadastrados',
      icon: <TrendingUp className="h-6 w-6" />,
    },
    {
      id: 'fichas-tecnicas',
      title: 'Fichas Técnicas',
      description: 'Relatório de fichas técnicas por produto',
      icon: <FileText className="h-6 w-6" />,
    },
    {
      id: 'custos-producao',
      title: 'Custos de Produção',
      description: 'Análise de custos por período',
      icon: <TrendingUp className="h-6 w-6" />,
    },
  ];

  const handleGenerateReport = (reportId: string) => {
    // Aqui seria implementada a lógica para gerar o relatório
    alert(`Relatório "${reportId}" seria gerado aqui`);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Relatórios de Produção"
        description="Gere relatórios detalhados sobre o sistema de produção"
        icon={BarChart3}
      />

      {/* Filtros de período */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 flex items-center text-lg font-semibold text-gray-900">
          <Calendar className="mr-2 h-5 w-5" />
          Filtros de Período
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Data Inicial</label>
            <input
              type="date"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Data Final</label>
            <input
              type="date"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <Button className="w-full">Aplicar Filtros</Button>
          </div>
        </div>
      </div>

      {/* Tipos de Relatório */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {reportTypes.map((report) => (
          <div key={report.id} className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="rounded-lg bg-blue-100 p-2">{report.icon}</div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{report.title}</h3>
                  <p className="mt-1 text-sm text-gray-600">{report.description}</p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => handleGenerateReport(report.id)} className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                Gerar Relatório
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Relatórios Personalizados */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Relatórios Personalizados</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Selecionar Produto
            </label>
            <div className="relative">
              <select className="w-full appearance-none rounded-md border border-gray-300 px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Todos os produtos</option>
                <option value="produto1">Produto 1</option>
                <option value="produto2">Produto 2</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                <svg
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Tipo de Relatório
            </label>
            <div className="relative">
              <select className="w-full appearance-none rounded-md border border-gray-300 px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="ordens">Ordens de Produção</option>
                <option value="custos">Análise de Custos</option>
                <option value="eficiencia">Eficiência de Produção</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                <svg
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Gerar Relatório Personalizado
          </Button>
        </div>
      </div>

      {/* Histórico de Relatórios */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Histórico de Relatórios</h2>
        <div className="py-8 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum relatório gerado</h3>
          <p className="mt-1 text-sm text-gray-500">
            Os relatórios gerados aparecerão aqui para download posterior.
          </p>
        </div>
      </div>
    </div>
  );
}
