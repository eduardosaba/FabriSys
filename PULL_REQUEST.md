# PR: Stabilização: correções Pedidos/MRP, migrations e hardening

## Resumo

- Correções de hoisting e loop de re-renders nas páginas de `Pedidos` e `Planejamento`
- Remoção de fallbacks client-side após aplicação de migrations
- Adição de migrations seguras (`migrations/999_*`) para RPC e view reutilizáveis
- Hardening das chamadas Supabase (melhor logging e tipagem defensiva)
- Script de diagnóstico: `scripts/diagnose-supabase.mjs`

## Testes e lint

- Vitest: 42 testes passando
- ESLint: ~20 warnings (não críticos)

## O que revisar

- Migrations em `migrations/999_*` (verificar aplicação no DB)
- Mudanças em `app/dashboard/insumos/pedidos-compra/page.tsx` e `app/dashboard/producao/planejamento/page.tsx`

## Notas

- Recomendo revisar e aplicar migrations em staging antes de produção.

---

_Arquivo gerado automaticamente pelo assistente. Use este conteúdo para criar o Pull Request via GitHub web ou CLI._
