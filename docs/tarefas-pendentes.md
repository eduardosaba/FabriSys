# Tarefas pendentes (03/11/2025)

## Configuração e qualidade de código

- [feito] Avisos do `pnpm run lint` resolvidos (unused vars/imports em APIs e componentes, `any` substituídos, dependências do `useEffect` corrigidas em `CategoriaSelector`).
- [feito] Regras type-aware do `typescript-eslint` habilitadas apenas para TS/TSX e em nível `warn` (adoção gradual). Próximos ajustes sugeridos: tipar respostas do Supabase, usar `void`/`await` em chamadas assíncronas em efeitos/eventos, remover `async` quando não há `await`.
- Confirmar se o `tailwind.config.cjs` ignorado no ESLint não precisa de validação adicional.

## Build e execução

- Subir o servidor com `pnpm run dev` para garantir que a migração dos arquivos `.mjs` -> `.cjs` resolveu o erro do `jiti`.
- Testar geração de PDFs após os ajustes de dependências.

## Documentação

- Avaliar se outras guias de contribuição/README precisam mencionar o uso da configuração ESLint em `eslint.config.mjs`.

-Quer que eu deixe os warnings completamente zerados e/ou torne alguns warnings em errors? Posso:
-limpar warnings restantes (se houver em novas alterações);
-apertar as regras no eslint.config.mjs (ex.: --max-warnings=0 ou elevar algumas para error);
-eguir para “pnpm run dev” e validar o erro antigo do Tailwind/jiti e em seguida testar geração de PDFs.
-Se preferir, já inicio o dev server e validamos a execução do app.

## Levantamento rápido (build e lint)

- Execução: 03/11/2025
- Lint: 0 errors, 26 warnings
  - Principais arquivos/rótulos
    - components/insumos/AlertasEstoque.tsx: no-floating-promises, no-unsafe-\*
    - components/insumos/LotesTable.tsx: no-floating-promises, no-misused-promises
    - components/insumos/LoteInsumoForm.tsx: no-floating-promises
    - lib/theme.tsx: require-await, no-unsafe-assignment
    - app/dashboard/fornecedores/page.tsx e lib/pdf.ts: no-unnecessary-type-assertion
- Build (TypeScript): 1 erro bloqueante
  - app/dashboard/insumos/page.tsx: propriedade "dataKey" inexistente no componente Chart (ajuste rápido no wrapper/props do Chart)

Observação: O restante das rotas de pedidos foi tipado com Zod (API e consumo em UI), reduzindo riscos de `any` nas respostas.
