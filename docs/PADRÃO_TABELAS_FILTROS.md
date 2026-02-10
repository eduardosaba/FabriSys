# Padrão de Tabelas com Busca e Filtros

Este documento descreve o padrão implementado para tabelas com funcionalidades de busca, filtros e estados de loading no FabriSys.

## Componentes Base

### 1. `useTableFilters` Hook

Hook customizado para gerenciar filtros e busca em tabelas.

```tsx
import { useTableFilters } from '@/hooks/useTableFilters';

const MyTableComponent = ({ items }) => {
  const filters = useTableFilters(items, {
    searchFields: ['nome', 'descricao'], // Campos para busca
    statusField: 'ativo', // Campo de status para filtro
  });

  // filters.filteredItems - Itens filtrados
  // filters.resultCount - Número de resultados
  // filters.totalCount - Total de itens
  // filters.searchTerm - Termo de busca atual
  // filters.setSearchTerm - Função para alterar busca
  // filters.statusFilter - Filtro de status atual
  // filters.setStatusFilter - Função para alterar filtro
};
```

### 2. `TableControls` Component

Componente para controles de busca e filtros.

```tsx
import TableControls from '@/components/ui/TableControls';

<TableControls filters={filters} searchPlaceholder="Buscar itens..." showStatusFilter={true} />;
```

### 3. `EmptyState` Component

Componente para estados vazios da tabela.

```tsx
import EmptyState from '@/components/ui/EmptyState';

// Estado sem dados
<EmptyState
  type="no-data"
  title="Nenhum item cadastrado"
  description="Comece criando o primeiro item."
  action={{
    label: "Criar primeiro item",
    onClick: () => navigate('/novo'),
    icon: <Plus className="h-5 w-5" />,
  }}
/>

// Estado sem resultados após filtro
<EmptyState
  type="no-results"
  title="Nenhum item encontrado"
  description="Tente ajustar os filtros de busca."
/>
```

## Exemplo Completo

```tsx
'use client';

import { useState } from 'react';
import { Edit, Trash2, Loader2 } from 'lucide-react';
import { useTableFilters } from '@/hooks/useTableFilters';
import TableControls from '@/components/ui/TableControls';
import EmptyState from '@/components/ui/EmptyState';

interface MyItem {
  id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
}

interface MyTableProps {
  items: MyItem[];
  onEdit: (item: MyItem) => void;
  onDelete: (item: MyItem) => void;
  loading?: boolean;
}

export default function MyTable({ items, onEdit, onDelete, loading }: MyTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Usar o hook de filtros
  const filters = useTableFilters(items, {
    searchFields: ['nome', 'descricao'],
  });

  const handleDelete = async (item: MyItem) => {
    setDeletingId(item.id);
    try {
      await onDelete(item);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-lg bg-white shadow">
      {/* Controles de busca e filtro */}
      {items.length > 0 && <TableControls filters={filters} searchPlaceholder="Buscar itens..." />}

      {/* Estados vazios */}
      {filters.filteredItems.length === 0 && items.length > 0 ? (
        <EmptyState
          type="no-results"
          title="Nenhum item encontrado"
          description="Tente ajustar os filtros de busca ou status."
        />
      ) : filters.filteredItems.length === 0 ? (
        <EmptyState
          type="no-data"
          title="Nenhum item cadastrado"
          description="Comece criando o primeiro item."
          action={{
            label: 'Criar primeiro item',
            onClick: () => navigate('/novo'),
            icon: <Plus className="h-5 w-5" />,
          }}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filters.filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{item.nome}</div>
                    {item.descricao && (
                      <div className="text-sm text-gray-500">{item.descricao}</div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5
                      ${item.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                    >
                      {item.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onEdit(item)}
                        className="rounded p-1 text-yellow-600 hover:text-yellow-900 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        title="Editar"
                        aria-label={`Editar ${item.nome}`}
                        disabled={loading}
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="rounded p-1 text-red-600 hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                        title="Excluir"
                        disabled={loading || deletingId === item.id}
                        aria-label={`Excluir ${item.nome}`}
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Trash2 className="h-5 w-5" />
                        )}
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
  );
}
```

## Funcionalidades Implementadas

### ✅ Busca em Tempo Real

- Campo de busca com ícone
- Busca em múltiplos campos configuráveis
- Destaque visual durante busca

### ✅ Filtros de Status

- Select dropdown para filtrar por status
- Opções configuráveis (ativo/inativo)
- Contador de resultados

### ✅ Estados de Loading

- Loading nos botões de ação durante operações
- Desabilitação de controles durante loading
- Feedback visual com spinners

### ✅ Acessibilidade (ARIA)

- Atributos `aria-label` em todos os controles
- Navegação por teclado com `focus` rings
- Títulos descritivos (`title`) nos botões

### ✅ Responsividade

- Layout flexível (coluna em mobile, linha em desktop)
- `overflow-x-auto` nas tabelas
- Controles adaptáveis ao tamanho da tela

### ✅ Estados Vazios

- Estados diferentes para "sem dados" vs "sem resultados"
- Call-to-action para criar primeiros itens
- Ícones contextuais apropriados

## Benefícios

1. **Consistência**: Padrão uniforme em todas as tabelas
2. **Reutilização**: Componentes base compartilhados
3. **Manutenibilidade**: Lógica centralizada nos hooks
4. **UX Melhorada**: Busca, filtros e feedback visual
5. **Acessibilidade**: Navegação por teclado e leitores de tela
6. **Performance**: Filtragem otimizada com useMemo

## Implementações Existentes

- ✅ `ListaProdutos.tsx` - Tabela de produtos finais
- ✅ `InsumosTable.tsx` - Tabela de insumos
- 🔄 `LotesTable.tsx` - Tabela de lotes (próximo)
- 🔄 Páginas com tabelas inline (ordens, fichas técnicas, etc.)

Para implementar em uma nova tabela, siga o exemplo acima e use os componentes base criados.</content>
<parameter name="filePath">d:\DOCUMENTOS PAI\SistemaLari\syslari\docs\PADRÃO_TABELAS_FILTROS.md
