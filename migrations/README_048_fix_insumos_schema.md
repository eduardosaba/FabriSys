# Migração: Correção do Schema da Tabela Insumos

## Problema

A tabela `insumos` tinha inconsistências entre o schema do TypeScript e o banco de dados:

- `categoria_id` estava como `BIGINT` mas deveria ser `UUID`
- Alguns campos importantes estavam faltando ou não eram consistentes

## Solução

A migração `048_fix_insumos_schema.sql` corrige essas inconsistências e garante que todos os campos necessários estejam presentes.

## Campos Corrigidos/Adicionados

### categoria_id

- **Tipo**: `UUID` (alterado de `BIGINT`)
- **Referência**: `categorias(id)`
- **Descrição**: ID da categoria do insumo

### atributos_dinamicos

- **Tipo**: `JSONB`
- **Padrão**: `'{}'::jsonb`
- **Descrição**: Atributos dinâmicos para propriedades customizáveis do insumo

### Sistema de Unidades Duplas

- **unidade_estoque**: `TEXT` - Unidade de Estoque (UE) - como o item é comprado e armazenado
- **custo_por_ue**: `DECIMAL(10,2)` - Custo por Unidade de Estoque
- **unidade_consumo**: `TEXT` - Unidade de Consumo (UC) - unidade usada na receita
- **fator_conversao**: `DECIMAL(10,3)` - Fator de Conversão (quantidade UC em 1 UE)

### Campos Adicionais

- **produto_final_id**: `UUID` - Referência a produto semi-acabado
- **tipo_insumo**: `VARCHAR(10)` - Tipo do insumo ('fisico' ou 'virtual')

## Como Executar

### 1. No Supabase Dashboard

1. Acesse seu projeto Supabase
2. Vá para "SQL Editor"
3. Execute o arquivo `048_fix_insumos_schema.sql`

### 2. Via CLI (se usar Supabase CLI)

```bash
supabase db push
```

### 3. Verificação

Execute o script `verify_insumos_schema.sql` para confirmar que:

- Todos os campos estão presentes
- Os tipos de dados estão corretos
- As constraints estão aplicadas
- Os índices foram criados

### 4. Repopulação de Categorias (Opcional)

Se categoria_id foi recriado e os dados foram perdidos, execute `repopulate_categorias.sql` para tentar reassociar automaticamente os insumos às categorias baseado em padrões de nome.

## Impacto

- **categoria_id**: Se existir como BIGINT, será recriado como UUID (dados existentes serão perdidos)
- **Campos novos**: Serão adicionados com valores padrão apropriados
- **Constraints**: Serão adicionadas para garantir integridade dos dados

## ⚠️ Importante sobre categoria_id

**Se categoria_id já existir como BIGINT:**

- A migração irá **DROPAR** a coluna existente e recriá-la como UUID
- **Todos os dados de categoria existentes serão perdidos**
- Execute o script `repopulate_categorias.sql` após a migração para tentar reassociar automaticamente baseado em padrões de nome

**Backup recomendado:**

```sql
CREATE TABLE insumos_backup AS SELECT * FROM insumos;
```

## Rollback

Se necessário fazer rollback, os dados originais de categoria_id serão perdidos, pois a conversão é destrutiva. Recomenda-se fazer backup antes da execução.

## Testes

Após a migração, teste:

1. Cadastro de novos insumos
2. Edição de insumos existentes
3. Funcionalidades que usam categoria_id
4. Sistema de unidades duplas
5. Atributos dinâmicos
