# Fluxo de Fichas Técnicas (Resumo)

Este documento descreve o fluxo atual de fichas técnicas no sistema e a mudança de UI para suportar _insumos compostos_ (preparações).

## Modelo atual

- A ficha técnica é sempre vinculada a um `produto_final` (campo `produto_final_id`).
- Cada item da ficha (`fichas_tecnicas`) representa um insumo simples, com referência a `insumo_id` (itens de estoque).
- A criação é feita via fluxo client-side em `/dashboard/producao/fichas-tecnicas/nova`, que monta um payload e chama `/api/fichas-tecnicas/create`.
- A UI atual permite listar insumos, informar quantidade, unidade de consumo, perda e custo.

## Nova adição (UI)

- Foi adicionada a opção de marcar um insumo como **Preparação**, ou seja, usar um `produto_final` existente como insumo.
- No editor (`components/producao/FichaTecnicaEditor.tsx`):
  - Cada insumo tem um checkbox `Preparação (usar produto final)`.
  - Se marcado, o campo de busca por insumo é substituído por um `select` de `produtos_finais` ativos.
  - Ao selecionar uma preparação, o insumo passa a conter `isComposto: true` e `compostoProdutoId` com o `id` do produto final selecionado.

## Filtragem por tipo de produto na criação de Ficha Técnica

- Na página de criação de ficha (`app/dashboard/producao/fichas-tecnicas/nova`) foi adicionada uma seleção de **Tipo de Produto** antes da escolha do produto. Você pode alternar entre:
  - `Produto Final (Acabado)` — produtos prontos para venda.
  - `Produto Massa / Preparação` — produtos intermediários usados como insumos.
- A lista de produtos exibida é filtrada pelo tipo selecionado (`tipo` na tabela `produtos_finais`).

## Back-end / Persistência (recomendação)

- Atualmente o payload de criação espera insumos simples. Para suportar preparações é necessário:
  1. Atualizar a API `/api/fichas-tecnicas/create` para aceitar, por item de insumo, um dos dois formatos:
     - Insumo simples: `{ insumoId, quantidade, unidadeMedida, perdaPadrao, custoUnitario }`
     - Preparação: `{ compostoProdutoId, quantidade, unidadeMedida, perdaPadrao }`
  2. No servidor, ao receber uma preparação, gravar um registro de ficha técnica que aponte para `insumo_id = null` e contenha `produto_final_referencia` (novo campo) ou usar uma lógica de normalização (criar relações entre FTs).
  3. Atualizar políticas RLS/migrations se necessário para autorizar gravação desses campos.

## Cálculo de custo e consumo

- Para preparações reutilizáveis, o custo pode ser obtido a partir da ficha técnica da preparação (sumarizar seus insumos) ou gravado como custo unitário calculado previamente.
- Recomenda-se definir uma regra clara:
  - Preferência 1: recalcular custo a partir da FT referenciada (mais consistente, porém mais custoso computacionalmente).
  - Preferência 2: aceitar um `custoUnitario` informado no insumo composto (mais performático, pode divergir do real).

## Como testar localmente

- Rodar o servidor:

```bash
cd syslari
pnpm install
pnpm dev
```

- Abrir `Nova Ficha Técnica`, adicionar um insumo, marcar `Preparação` e selecionar um `produto_final`.
- Verificar payload enviado ao salvar (usar devtools -> Network) e confirmar que os insumos incluem `isComposto` e `compostoProdutoId`.

## Próximos passos sugeridos

- Atualizar a API server-side para aceitar insumos compostos.
- Garantir que o cálculo de custo considere FTs referenciadas ou aceite custo unitário informado.
- Adicionar testes/unitários para cobertura do novo comportamento.

---

Documento gerado automaticamente pela equipe de desenvolvimento.
