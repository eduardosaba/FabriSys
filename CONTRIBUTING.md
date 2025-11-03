# Contribuindo para o FabriSys

Obrigado por contribuir! Siga estas orientações rápidas para que seu PR tenha mais chance de ser revisado e aceito rapidamente.

## Workflow recomendado

1. Crie uma branch com nome claro: `feature/descricao-curta` ou `fix/descricao-curta`.
2. Faça commits pequenos e com mensagens descritivas (ex.: `feat: adicionar botão de login`).
3. Abra um PR apontando para `main`, descreva o que foi feito e referencie qualquer issue relacionada.

## Checks locais (pré-PR)

- Rode formatação:

```bash
pnpm format
```

- Rode lint:

```bash
pnpm lint
```

- Rode testes:

```bash
pnpm test
```

## Padrões de código

- O projeto usa o ESLint com Flat Config em `eslint.config.mjs`; ajuste regras ali quando necessário.
- Siga as regras do ESLint e Prettier configuradas no repositório.
- Evite adicionar credenciais ou segredos no código.

## Revisões e merges

- Peça pelo menos 1 revisão antes de mergear.
- Se houver conflitos, rebase ou atualize sua branch com `main` antes do merge.

## Reportando bugs

Abra uma issue com passos para reproduzir, resultado esperado e logs/prints se necessário.

---

Se quiser que eu configure templates adicionais de PR/checklist automáticos ou integre o GitHub Actions para gerar PR templates, posso ajudar — diga o que prefere.
