'use client';

import Button from '@/components/Button';
import { FileText, Download, Calendar, TrendingUp } from 'lucide-react';

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relatórios de Produção</h1>
        <p className="text-gray-600 mt-2">Gere relatórios detalhados sobre o sistema de produção</p>
      </div>

      {/* Filtros de período */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 mr-2" />
          Filtros de Período
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data Inicial</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data Final</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <Button className="w-full">Aplicar Filtros</Button>
          </div>
        </div>
      </div>

      {/* Tipos de Relatório */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportTypes.map((report) => (
          <div key={report.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">{report.icon}</div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{report.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => handleGenerateReport(report.id)} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Gerar Relatório
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Relatórios Personalizados */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Relatórios Personalizados</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecionar Produto
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todos os produtos</option>
              <option value="produto1">Produto 1</option>
              <option value="produto2">Produto 2</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Relatório
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="ordens">Ordens de Produção</option>
              <option value="custos">Análise de Custos</option>
              <option value="eficiencia">Eficiência de Produção</option>
            </select>
          </div>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Gerar Relatório Personalizado
          </Button>
        </div>
      </div>

      {/* Histórico de Relatórios */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Histórico de Relatórios</h2>
        <div className="text-center py-8">
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
