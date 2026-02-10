# 🎯 Meta do Dia e 💎 Clube Fidelidade - Guia de Implementação

## 📋 Resumo

Este pacote adiciona duas funcionalidades poderosas ao PDV do FabriSys:

1. **Meta do Dia** - Gamificação com barra de progresso e confetes ao atingir meta
2. **Clube Fidelidade** - Sistema de pontos/cashback para retenção de clientes

---

## 🛠️ Instalação e Configuração

### 1. Instalar Dependências

```powershell
cd syslari
pnpm add canvas-confetti
```

### 2. Configurar Banco de Dados

Execute o script SQL no **Supabase SQL Editor**:

```
syslari/migrations/010_setup_metas_e_fidelidade.sql
```

Este script cria:

- Tabela `clientes` (nome, telefone, pontos)
- Tabela `metas_vendas` (meta por loja/dia)
- Coluna `cliente_id` na tabela `vendas`
- RPC `atualizar_pontos_cliente()`
- RPC `finalizar_venda_completa()` (versão com fidelidade)
- Políticas RLS apropriadas

---

## 🎯 Meta do Dia

### Como Funciona

- Mostra uma barra de progresso no topo do PDV
- Compara vendas do dia vs meta configurada
- **Efeito especial**: Confetes quando atinge 100%!
- Meta padrão: R$ 1.000,00 (se não configurada no banco)

### Configurar Meta

Execute no SQL Editor:

```sql
INSERT INTO metas_vendas (local_id, data_referencia, valor_meta)
VALUES (
  'UUID-DA-SUA-LOJA',  -- Substitua pelo ID real
  CURRENT_DATE,
  1500.00  -- Meta desejada
)
ON CONFLICT (local_id, data_referencia)
DO UPDATE SET valor_meta = EXCLUDED.valor_meta;
```

Ou consulte o ID da loja:

```sql
SELECT id, nome FROM locais WHERE tipo = 'pdv';
```

---

## 💎 Clube Fidelidade

### Regras de Pontuação

- **Ganho**: 1 ponto para cada R$ 1,00 gasto
- **Resgate**: 1 ponto = R$ 0,05 de desconto (5% de cashback)
- **Exemplo**: Cliente gasta R$ 50,00 → ganha 50 pontos (R$ 2,50 de desconto futuro)

### Como Usar no PDV

**Durante a Venda:**

1. Digite o telefone do cliente no campo "CPF ou Celular"
2. Clique na lupa (ou Enter)
3. Se cliente existe → mostra saldo de pontos
4. Se não existe → oferece cadastro rápido
5. Marque "Usar saldo" para aplicar desconto
6. Finalize a venda normalmente

**Ao finalizar:**

- Pontos usados são debitados
- Pontos novos são creditados automaticamente

### Cadastrar Cliente Manualmente (SQL)

```sql
INSERT INTO clientes (nome, telefone, saldo_pontos)
VALUES ('Maria Santos', '11999887766', 0)
ON CONFLICT (telefone) DO NOTHING;
```

---

## 🧪 Testes Rápidos

### Testar Meta do Dia

1. Configure uma meta baixa (ex: R$ 100) para teste:

```sql
INSERT INTO metas_vendas (local_id, data_referencia, valor_meta)
VALUES ((SELECT id FROM locais WHERE tipo = 'pdv' LIMIT 1), CURRENT_DATE, 100.00)
ON CONFLICT (local_id, data_referencia) DO UPDATE SET valor_meta = 100.00;
```

2. Acesse o PDV e faça uma venda de R$ 100+
3. Veja a barra de progresso encher e os confetes aparecerem! 🎉

### Testar Fidelidade

1. Cadastre um cliente de teste com pontos:

```sql
INSERT INTO clientes (nome, telefone, saldo_pontos)
VALUES ('Cliente Teste', '00000000000', 200)  -- 200 pontos = R$ 10,00 desconto
ON CONFLICT (telefone) DO UPDATE SET saldo_pontos = 200;
```

2. No PDV, adicione produtos ao carrinho (ex: R$ 50,00)
3. Digite `00000000000` no campo de cliente
4. Marque "Usar saldo"
5. Veja o desconto aplicado (R$ 10,00 → Total cai para R$ 40,00)
6. Finalize a venda
7. Cliente ganha 40 pontos novos (R$ 40 gastos)

### Verificar Pontos Atualizados

```sql
SELECT nome, telefone, saldo_pontos
FROM clientes
WHERE telefone = '00000000000';
```

Deve mostrar: `200 - 200 (usados) + 40 (ganhos) = 40 pontos`

---

## 📊 Consultas Úteis

### Ver Vendas com Cliente

```sql
SELECT
  v.created_at,
  c.nome as cliente,
  v.total_venda,
  v.metodo_pagamento
FROM vendas v
LEFT JOIN clientes c ON v.cliente_id = c.id
WHERE v.created_at::date = CURRENT_DATE
ORDER BY v.created_at DESC;
```

### Ranking de Clientes (Top 10 Pontos)

```sql
SELECT nome, telefone, saldo_pontos,
       (saldo_pontos * 0.05) as desconto_disponivel
FROM clientes
ORDER BY saldo_pontos DESC
LIMIT 10;
```

### Total de Vendas do Dia por Loja

```sql
SELECT
  l.nome as loja,
  COUNT(v.id) as qtd_vendas,
  SUM(v.total_venda) as total
FROM vendas v
JOIN locais l ON v.local_id = l.id
WHERE v.created_at::date = CURRENT_DATE
GROUP BY l.nome;
```

---

## 🎨 Componentes Criados

- `components/pdv/MetaDoDiaWidget.tsx` - Barra de progresso da meta
- `components/pdv/ClienteFidelidade.tsx` - Busca e gestão de pontos
- `migrations/010_setup_metas_e_fidelidade.sql` - Setup do banco

---

## 🔧 Manutenção

### Resetar Pontos de um Cliente

```sql
UPDATE clientes SET saldo_pontos = 0 WHERE telefone = '11999999999';
```

### Mudar Fator de Conversão

Edite `FATOR_CONVERSAO` em `ClienteFidelidade.tsx`:

```typescript
const FATOR_CONVERSAO = 0.1; // 1 ponto = R$ 0,10 (10% cashback)
```

### Desabilitar Temporariamente

Comente as linhas de renderização em `caixa/page.tsx`:

```tsx
{
  /* <MetaDoDiaWidget localId={localId} vendasHoje={vendasHoje} /> */
}
{
  /* <ClienteFidelidade ... /> */
}
```

---

## 🎛️ Painel Administrativo

### 1. Gestão de Metas (`/dashboard/configuracoes/metas`)

Interface para configurar metas de vendas por loja e período.

**Funcionalidades:**

- Seleção de loja/PDV e mês de referência
- Input de meta mensal com botão "Distribuir" (divide automaticamente pelos dias do mês)
- Grid editável com metas diárias (7 colunas para visualização semanal)
- Salvar alterações com upsert automático no banco
- Valores editáveis individualmente para ajustes finos

**Como usar:**

1. Acesse Menu → Configurações → Gestão de Metas
2. Selecione a loja e o mês desejado
3. Digite o valor da meta mensal (ex: R$ 30.000)
4. Clique em "Distribuir" para calcular metas diárias
5. Ajuste valores específicos clicando nos cards de cada dia
6. Clique em "Salvar Alterações"

---

### 2. Configuração de Fidelidade (`/dashboard/configuracoes/fidelidade`)

Central de gerenciamento do Clube de Fidelidade.

**Funcionalidades:**

- **Toggle Ativa/Desativa**: Liga ou desliga a campanha de fidelidade
  - Quando desativada, o componente `ClienteFidelidade` **não aparece no PDV**
- **Configurar Cashback**: Define o valor de conversão de pontos (padrão: R$ 0,05 = 5%)
- **Base de Clientes**: Busca e visualiza clientes cadastrados
- **Saldo de Pontos**: Exibe pontuação acumulada e equivalente em reais

**Como usar:**

1. Acesse Menu → Configurações → Clube Fidelidade
2. Use o toggle para ativar/desativar a campanha
3. Ajuste o "Valor do Ponto em Reais" conforme estratégia de cashback desejada
4. Clique em "Salvar Configurações"
5. Use o campo de busca para encontrar clientes específicos
6. Visualize ranking de clientes por pontos acumulados

**Importante**: Com a campanha desativada, o sistema fica mais leve pois não renderiza a busca de clientes no PDV.

---

### 3. Relatório de Performance (`/dashboard/relatorios/performance`)

Dashboard analítico para acompanhamento de metas vs vendas.

**Funcionalidades:**

- **KPIs Gerais**:
  - Total Vendido no período
  - Meta Total do período
  - Percentual de Atingimento
  - Dias com Meta Batida
- **Tabela Detalhada**: Comparação dia a dia com:
  - Data com dia da semana
  - Meta configurada
  - Valor vendido
  - Diferença (positiva/negativa)
  - Percentual de atingimento
  - Status visual (✓ Atingiu / ✗ Abaixo)

**Como usar:**

1. Acesse Menu → Relatórios → Performance
2. Selecione loja e mês
3. Analise os KPIs coloridos no topo
4. Navegue pela tabela para identificar dias críticos
5. Use as cores como referência:
   - 🔵 Azul: Total vendido
   - 🟣 Roxo: Meta estabelecida
   - 🟢 Verde: Atingimento acima de 100%
   - 🟠 Laranja: Atingimento abaixo de 100%

---

### 4. KPIs de Meta na Dashboard Principal

Widget exibido na dashboard principal (`/dashboard`).

**O que mostra:**

- Card individual para cada PDV/loja
- Progresso do dia atual (vendido vs meta)
- Barra de progresso visual
- Indicador "✓ ATINGIU" quando meta é batida
- Percentual de superação quando ultrapassa 100%

**Atualização:**

- Carrega automaticamente ao acessar a dashboard
- Consulta vendas desde 00:00 do dia atual
- Usa meta do dia ou fallback de R$ 1.000

---

## 🔐 Segurança e Permissões

### Configurações de Sistema

A tabela `configuracoes_sistema` armazena:

```sql
-- Exemplo de registros
chave: 'fidelidade_ativa' → valor: 'true' / 'false'
chave: 'fidelidade_fator' → valor: '0.05' (R$ por ponto)
```

Execute a migration adicional se necessário:

```
syslari/migrations/011_configuracoes_fidelidade.sql
```

### Row Level Security (RLS)

As políticas criadas permitem:

- ✅ Todos usuários autenticados podem ler/editar metas
- ✅ Todos usuários autenticados podem ler/editar clientes
- ✅ Operações via RPC (`atualizar_pontos_cliente`) respeitam autenticação

**Nota**: Em ambientes multi-tenant, ajuste as policies para filtrar por `organization_id`.

---

## 🚀 Próximos Passos Sugeridos

1. **Exportar relatório de clientes** (CSV/Excel)
2. **Notificação por SMS** quando cliente acumula X pontos
3. **Promoções especiais** (ex: "Dobro de pontos às terças")
4. **Histórico de transações** do cliente no painel
5. **Meta semanal/mensal** além da diária

---

## 📝 Notas Importantes

- A meta é carregada da tabela `metas_vendas`; se não existir, usa R$ 1.000 como fallback
- Pontos são atualizados **após** a venda ser concluída (transação atômica)
- `vendasHoje` é rastreado localmente na sessão do caixa (não persiste no refresh)
- Para tracking real de vendas do dia, implemente uma query ao carregar o PDV

---

**Desenvolvido para FabriSys** 🏭
