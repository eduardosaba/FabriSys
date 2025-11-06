# 📊 Módulo 2: Dashboard Configurável de Produção

## 🎯 Visão Geral

O Módulo 2 implementa um sistema completo de dashboard configurável para monitoramento e controle de produção, oferecendo aos usuários uma interface personalizável e em tempo real para acompanhar indicadores de produção, ordens de trabalho e métricas de desempenho.

## 🏗️ Arquitetura do Sistema

### Componentes Principais

#### 1. **DashboardLayout** (`components/dashboard/DashboardLayout.tsx`)

- **Responsabilidade**: Gerencia o layout principal do dashboard com suporte a drag-and-drop
- **Funcionalidades**:
  - Grid responsivo com múltiplos tamanhos de widgets
  - Drag-and-drop para reordenação de widgets
  - Renderização dinâmica de componentes baseada na configuração
- **Tecnologias**: React, @hello-pangea/dnd, Tailwind CSS

#### 2. **Widget** (`components/dashboard/Widget.tsx`)

- **Responsabilidade**: Componente base para todos os widgets do dashboard
- **Funcionalidades**:
  - Suporte a 4 tamanhos: 1x1, 2x1, 1x2, 2x2
  - 4 temas: padrão, claro, escuro, destacado
  - Interface consistente para todos os widgets
- **Props**:
  ```typescript
  interface WidgetProps {
    title: string;
    children: ReactNode;
    className?: string;
    onRemove?: () => void;
    isDragging?: boolean;
    dragHandleProps?: any;
    size?: WidgetSize;
    theme?: WidgetTheme;
  }
  ```

#### 3. **ConfigurarDashboard** (`components/dashboard/ConfigurarDashboard.tsx`)

- **Responsabilidade**: Modal para configuração e adição de widgets
- **Funcionalidades**:
  - Seleção de tipo de widget
  - Configuração de tamanho e tema
  - Parâmetros específicos por widget
- **Integração**: Dialog do Radix UI

#### 4. **DashboardContext** (`contexts/DashboardContext.tsx`)

- **Responsabilidade**: Gerenciamento de estado global do dashboard
- **Funcionalidades**:
  - CRUD de widgets
  - Persistência automática no Supabase
  - Sincronização entre componentes
- **Estado**:
  ```typescript
  interface DashboardContextType {
    widgets: WidgetConfig[];
    addWidget: (widget: Omit<WidgetConfig, 'id' | 'ordem'>) => void;
    removeWidget: (id: string) => void;
    updateWidget: (id: string, config: Partial<WidgetConfig>) => void;
    moveWidget: (fromIndex: number, toIndex: number) => void;
  }
  ```

## 📈 Widgets de Produção

### 1. **KPIsProducao** (`components/producao/KPIsProducao.tsx`)

**Indicadores de Produção**

- **Métricas**: Eficiência, Produtividade, Qualidade
- **Visualização**: Cards com valores e tendências
- **Atualização**: A cada 5 minutos
- **Fonte de dados**: Função RPC `calcular_kpis_producao`

### 2. **StatusProducao** (`components/producao/StatusProducao.tsx`)

**Status das Ordens de Produção**

- **Estados**: Em produção, Pausada, Pendente, Concluída
- **Visualização**: Lista de ordens ativas
- **Atualização**: A cada 30 segundos
- **Fonte de dados**: Tabela `ordens_producao`

### 3. **RankingProdutos** (`components/producao/RankingProdutos.tsx`)

**Ranking de Produtos por Performance**

- **Métricas**: Quantidade produzida, Valor total
- **Períodos**: Dia, Semana, Mês, Ano
- **Visualização**: Gráfico de barras verticais
- **Fonte de dados**: Função RPC `obter_ranking_produtos`

### 4. **AlertasProducao** (`components/producao/AlertasProducao.tsx`)

**Sistema de Alertas e Notificações**

- **Tipos**: Atrasos, Problemas, Avisos
- **Prioridades**: Alta, Média, Baixa
- **Notificações**: Sonoras (opcional)
- **Fonte de dados**: Sistema de alertas configurável

## 🗄️ Persistência de Dados

### Tabela `user_widgets`

```sql
CREATE TABLE user_widgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  ordem INTEGER NOT NULL,
  size TEXT DEFAULT '1x1' CHECK (size IN ('1x1', '2x1', '1x2', '2x2')),
  theme TEXT DEFAULT 'default' CHECK (theme IN ('default', 'light', 'dark', 'colored')),
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Políticas RLS

- **Leitura**: Usuários só acessam seus próprios widgets
- **Escrita**: Usuários só modificam seus próprios widgets
- **Exclusão**: Usuários só removem seus próprios widgets

## 🔧 Configuração e Personalização

### Tipos de Widget Disponíveis

```typescript
export type WidgetType =
  | 'producao' // Status de produção
  | 'alertas' // Alertas do sistema
  | 'kpis' // Indicadores de produção
  | 'ranking-produtos'; // Ranking de produtos
```

### Configurações por Widget

```typescript
interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  ordem: number;
  size?: WidgetSize;
  theme?: WidgetTheme;
  config?: {
    periodo?: 'dia' | 'semana' | 'mes' | 'ano';
    limite?: number;
    mostrarDetalhes?: boolean;
    produto_id?: string;
    categoria_id?: string;
    atualizacaoAutomatica?: boolean;
    intervaloAtualizacao?: number;
    exibirLegenda?: boolean;
    alertasSonoros?: boolean;
    destacarValores?: boolean;
  };
}
```

## 🔄 Atualização Automática

### Intervalos de Atualização

- **KPIs de Produção**: 5 minutos
- **Status de Produção**: 30 segundos
- **Ranking de Produtos**: 5 minutos
- **Alertas**: 1 minuto

### Implementação Técnica

```typescript
useEffect(() => {
  const interval = setInterval(() => {
    void loadData();
  }, intervaloAtualizacao * 1000);

  return () => clearInterval(interval);
}, [loadData]);
```

## 🎨 Interface do Usuário

### Layout Responsivo

- **Mobile**: Sidebar recolhível com overlay
- **Desktop**: Sidebar fixa com largura de 256px
- **Grid**: Sistema de 12 colunas adaptável

### Temas Disponíveis

- **Padrão**: Fundo branco, bordas cinzas
- **Claro**: Fundo cinza claro, maior contraste
- **Escuro**: Fundo cinza escuro, texto claro
- **Destacado**: Fundo azul claro, ênfase visual

## 🚀 Funcionalidades Avançadas

### Drag-and-Drop

- **Biblioteca**: @hello-pangea/dnd
- **Funcionalidades**:
  - Reordenação visual de widgets
  - Feedback visual durante arrastar
  - Salvamento automático da posição

### Personalização em Tempo Real

- **Adição**: Modal para seleção de widget
- **Configuração**: Parâmetros específicos por tipo
- **Remoção**: Confirmação e limpeza de estado

### Persistência Automática

- **Salvamento**: A cada modificação no layout
- **Sincronização**: Entre dispositivos e sessões
- **Backup**: Histórico mantido no Supabase

## 📊 Métricas e Monitoramento

### KPIs Principais

1. **Eficiência**: Percentual de utilização de recursos
2. **Produtividade**: Unidades produzidas por hora
3. **Qualidade**: Percentual de produtos aprovados

### Alertas do Sistema

- **Atrasos**: Ordens com prazo vencido
- **Problemas**: Falhas no processo produtivo
- **Manutenção**: Equipamentos necessitando intervenção

## 🔒 Segurança e Performance

### Controle de Acesso

- **Row Level Security**: Isolamento por usuário
- **Autenticação**: Supabase Auth
- **Autorização**: Políticas RLS ativas

### Otimização de Performance

- **Lazy Loading**: Componentes carregados sob demanda
- **Memoização**: React.memo para componentes estáticos
- **Debouncing**: Controle de frequência de atualizações

## 🧪 Testes e Qualidade

### Cobertura de Testes

- **Componentes**: Testes unitários com Jest
- **Integração**: Testes de contexto e estado
- **E2E**: Cenários completos de uso

### Linting e TypeScript

- **ESLint**: Regras customizadas para React/TypeScript
- **TypeScript**: Tipagem estrita em todos os componentes
- **Prettier**: Formatação automática de código

## 📚 APIs e Integrações

### Supabase RPC Functions

- `calcular_kpis_producao()`: Cálculo de indicadores
- `obter_ranking_produtos(p_periodo, p_limite)`: Ranking por período

### WebSockets (Planejado)

- **Tempo Real**: Atualizações instantâneas
- **Notificações**: Push para eventos críticos
- **Sincronização**: Estado compartilhado entre usuários

## 🎯 Próximos Passos

### Funcionalidades Planejadas

1. **Dashboards Compartilhados**: Vários usuários no mesmo dashboard
2. **Templates Pré-configurados**: Layouts prontos por setor
3. **Exportação de Dados**: PDF e Excel dos widgets
4. **Alertas Avançados**: Regras customizáveis por usuário

### Melhorias Técnicas

1. **Virtualização**: Para dashboards com muitos widgets
2. **Cache Inteligente**: Estratégias de cache por tipo de dado
3. **Offline Support**: Funcionamento básico sem conexão

---

## 📋 Checklist de Implementação

- ✅ Layout responsivo com sidebar
- ✅ Sistema de widgets configuráveis
- ✅ Drag-and-drop funcional
- ✅ Persistência no Supabase
- ✅ Atualização automática de dados
- ✅ Interface moderna e intuitiva
- ✅ Controle de acesso e segurança
- ✅ Testes e linting configurados
- ✅ Documentação completa

**Status**: ✅ **CONCLUÍDO** - Módulo 2 totalmente implementado e funcional.
