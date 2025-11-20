# Setup do Módulo de Ficha Técnica de Produção

## 📋 Resumo

Este documento descreve as alterações necessárias no banco de dados Supabase para suportar o módulo de **Ficha Técnica de Produção**.

## 🗄️ Alterações no Banco de Dados

### 1. Tabela `insumos` - Nova Coluna

- **Coluna adicionada**: `custo_unitario DECIMAL(10,2)`
- **Propósito**: Armazenar o custo unitário atual de cada insumo para cálculos de custos de produção
- **Padrão**: 0.00

### 2. Nova Tabela `fichas_tecnicas`

Armazena as receitas de produção de cada produto final, incluindo:

#### Campos Principais:

- `produto_final_id` - Referência ao produto final
- `insumo_id` - Referência ao insumo utilizado
- `quantidade` - Quantidade necessária do insumo
- `unidade_medida` - Unidade (kg, ml, un, etc)
- `perda_padrao` - Percentual de perda no processo (%)
- `rendimento_unidades` - Quantas unidades o produto rende
- `versao` - Controle de versões da ficha técnica
- `ativo` - Indica se esta versão está ativa

#### Recursos:

- ✅ Versionamento de fichas técnicas
- ✅ Soft delete (campo `ativo`)
- ✅ Trigger automático de `updated_at`
- ✅ Row Level Security (RLS)
- ✅ Índices para performance
- ✅ View `v_fichas_tecnicas_completas` com joins facilitados

## 🚀 Como Executar

### Opção 1: Script Consolidado (RECOMENDADO)

Execute o arquivo completo no SQL Editor do Supabase:

```bash
# Copie o conteúdo do arquivo:
migrations/setup_ficha_tecnica_completo.sql
```

### Opção 2: Migrações Individuais

Execute na ordem:

1. **Primeiro**: `033_add_custo_unitario_insumos.sql`
2. **Depois**: `032_setup_fichas_tecnicas.sql`

## ✅ Verificação

Após executar, você deve ver:

- ✅ Coluna `custo_unitario` na tabela `insumos`
- ✅ Tabela `fichas_tecnicas` criada
- ✅ View `v_fichas_tecnicas_completas` disponível
- ✅ Policies RLS configuradas

### Query de Verificação:

```sql
-- Verificar estrutura da tabela insumos
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'insumos'
AND column_name = 'custo_unitario';

-- Verificar tabela fichas_tecnicas
SELECT * FROM information_schema.tables
WHERE table_name = 'fichas_tecnicas';

-- Testar a view
SELECT * FROM v_fichas_tecnicas_completas LIMIT 5;
```

## 📊 Estrutura de Dados

### Relacionamentos:

```
produtos_finais (1) ----< (N) fichas_tecnicas (N) >---- (1) insumos
```

### Fluxo de Dados:

1. Produto final tem N insumos na ficha técnica
2. Cada linha da ficha técnica é um insumo com quantidade e perda
3. Custo total = Σ (quantidade × (1 + perda%) × custo_unitario)
4. Margem = (preço_venda - custo_total) / preço_venda × 100

## 🎯 Próximos Passos

1. **Cadastrar Custos dos Insumos**
   - Acessar `/dashboard/insumos`
   - Preencher o campo `custo_unitario` de cada insumo

2. **Criar Fichas Técnicas**
   - Acessar `/dashboard/producao`
   - Clicar em "Ficha Técnica" no produto desejado
   - Adicionar insumos, quantidades e perdas
   - Salvar

3. **Visualizar Custos**
   - O sistema calcula automaticamente:
     - Custo total do produto
     - Margem bruta (R$ e %)
     - Indicadores visuais de rentabilidade

## 🔒 Segurança (RLS)

### Políticas Configuradas:

- **Admin**: Acesso total (CRUD)
- **Fábrica**: Visualização de fichas ativas
- **PDV**: Sem acesso direto

## 📁 Arquivos Criados

```
migrations/
├── 032_setup_fichas_tecnicas.sql          # Cria tabela fichas_tecnicas
├── 033_add_custo_unitario_insumos.sql     # Adiciona custo_unitario
└── setup_ficha_tecnica_completo.sql       # Script consolidado ⭐

lib/types/
└── ficha-tecnica.ts                       # Tipos TypeScript

hooks/
└── useFichaTecnica.ts                     # Hook de gerenciamento

components/producao/
└── FichaTecnicaEditor.tsx                 # Componente principal

app/dashboard/producao/ficha-tecnica/[id]/
└── page.tsx                               # Página de edição
```

## ⚠️ Notas Importantes

1. **Ordem de Execução**: Execute primeiro a migração 033 (custo_unitario) antes da 032 (fichas_tecnicas)
2. **Dados Existentes**: Os scripts verificam se as tabelas/colunas já existem antes de criar
3. **Rollback**: Se necessário reverter, use:
   ```sql
   DROP TABLE fichas_tecnicas CASCADE;
   ALTER TABLE insumos DROP COLUMN custo_unitario;
   ```
4. **Performance**: A view `v_fichas_tecnicas_completas` já inclui todos os joins necessários

## 🐛 Troubleshooting

### Erro: "relation does not exist"

- Execute primeiro a migração 033 (custo_unitario)
- Verifique se a tabela `insumos` existe

### Erro: "foreign key violation"

- Certifique-se que existem produtos finais cadastrados
- Verifique se os IDs de insumos existem

### RLS bloqueando acesso

- Verifique o role do usuário: `SELECT auth.jwt() ->> 'role';`
- Admin deve ter role='admin' no perfil
