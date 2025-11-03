'use client';

import Card from '@/components/ui/Card';
import Panel from '@/components/ui/Panel';
import Text from '@/components/ui/Text';
import Link from 'next/link';
import { Package, ShoppingCart, AlertTriangle, Truck, Plus, List, BarChart } from 'lucide-react';
import { KPISection } from '@/components/ui/KPICards';
import Chart from '@/components/ui/Charts';
import Button from '@/components/Button';
import AlertasEstoque from '@/components/insumos/AlertasEstoque';
import { useState } from 'react';

export default function ProducaoDashboard() {
  const [showAlertasEstoque, setShowAlertasEstoque] = useState(true);

  return (
    <div className="space-y-6">
      <Panel>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Text variant="h2" weight="semibold">
            Dashboard de Produção
          </Text>
          <div className="flex gap-2">
            <Link href="/dashboard/insumos/cadastro">
              <Button variant="primary" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Novo Produto
              </Button>
            </Link>
            <Link href="/dashboard/fornecedores">
              <Button variant="secondary" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Novo Fornecedor
              </Button>
            </Link>
          </div>
        </div>
      </Panel>

      {/* Cards de Ação Rápida */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/dashboard/insumos/cadastro">
          <Card variant="default" className="hover:border-primary transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <Text variant="h4" weight="medium">
                  Cadastrar Produto
                </Text>
                <Text color="muted" className="text-sm">
                  Adicionar novo produto
                </Text>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/dashboard/insumos/lotes">
          <Card variant="default" className="hover:border-primary transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <Text variant="h4" weight="medium">
                  Estoque
                </Text>
                <Text color="muted" className="text-sm">
                  Gerenciar estoque
                </Text>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/dashboard/insumos/alertas">
          <Card variant="default" className="hover:border-primary transition-colors p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <Text variant="h4" weight="medium">
                  Alertas
                </Text>
                <Text color="muted" className="text-sm">
                  Ver alertas ativos
                </Text>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/dashboard/fornecedores">
          <Card variant="default" className="hover:border-primary transition-colors p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                <Truck className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <Text variant="h4" weight="medium">
                  Fornecedores
                </Text>
                <Text color="muted" className="text-sm">
                  Gerenciar fornecedores
                </Text>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* KPIs */}
      <KPISection
        kpis={{
          producaoTotal: 15234,
          eficiencia: 87.5,
          produtividade: 42.8,
          perdas: 1.8,
        }}
      />

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Produção Mensal por Produto */}
        <Card className="p-4">
          <Text variant="h3" weight="medium" className="mb-4">
            Produção Mensal por Produto
          </Text>
          <Chart
            type="bar"
            height={300}
            data={[
              { name: 'Jan', Produto1: 400, Produto2: 300, Produto3: 200 },
              { name: 'Fev', Produto1: 500, Produto2: 400, Produto3: 250 },
              { name: 'Mar', Produto1: 450, Produto2: 350, Produto3: 220 },
              // ... adicione mais dados mensais
            ]}
            series={[{ dataKey: 'Produto1', name: 'Produto 1' }]}
          />
        </Card>

        {/* Análise de Produção Anual */}
        <Card className="p-4">
          <Text variant="h3" weight="medium" className="mb-4">
            Análise de Produção Anual
          </Text>
          <Chart
            type="line"
            height={300}
            data={[
              { mes: 'Jan', producao: 900 },
              { mes: 'Fev', producao: 1150 },
              { mes: 'Mar', producao: 1020 },
              // ... adicione mais dados mensais
            ]}
            series={[{ dataKey: 'producao', name: 'Produção' }]}
            xAxisKey="mes"
          />
        </Card>

        {/* Alertas de Estoque */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Text variant="h3" weight="medium">
              Alertas de Estoque
            </Text>
            <Button
              variant="secondary"
              className="text-sm"
              onClick={() => setShowAlertasEstoque(!showAlertasEstoque)}
            >
              {showAlertasEstoque ? 'Ocultar' : 'Mostrar'}
            </Button>
          </div>
          {showAlertasEstoque && <AlertasEstoque />}
        </Card>

        {/* Resumo de Produtos */}
        <Card className="p-4">
          <Text variant="h3" weight="medium" className="mb-4">
            Resumo de Produtos
          </Text>
          <div className="space-y-4">
            {/* TODO: Adicionar gráficos e estatísticas de produtos */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Text variant="h4" weight="medium">
                Estatísticas em breve...
              </Text>
              <Text color="muted">Gráficos e análises detalhadas serão adicionados em breve.</Text>
            </div>
          </div>
        </Card>

        {/* Lista de Compras */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Text variant="h3" weight="medium">
              Lista de Compras
            </Text>
            <Button variant="secondary" className="text-sm flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nova Lista
            </Button>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Text variant="h4" weight="medium">
              Lista de Compras em breve...
            </Text>
            <Text color="muted">Sistema de lista de compras será implementado em breve.</Text>
          </div>
        </Card>

        {/* Relatórios Rápidos */}
        <Card className="p-4">
          <Text variant="h3" weight="medium" className="mb-4">
            Relatórios Rápidos
          </Text>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/dashboard/relatorios/validade">
              <Button variant="secondary" className="w-full flex items-center gap-2 justify-center">
                <BarChart className="h-4 w-4" />
                Relatório de Validade
              </Button>
            </Link>
            <Link href="/dashboard/relatorios/estoque">
              <Button variant="secondary" className="w-full flex items-center gap-2 justify-center">
                <List className="h-4 w-4" />
                Relatório de Estoque
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
