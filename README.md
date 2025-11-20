---
# FabriSys

[![CI](https://github.com/eduardosaba/FabriSys/actions/workflows/ci.yml/badge.svg)](https://github.com/eduardosaba/FabriSys/actions/workflows/ci.yml)
[![Lint](https://img.shields.io/badge/lint-eslint-brightgreen.svg)](https://github.com/eduardosaba/FabriSys)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)
[![Package Manager](https://img.shields.io/badge/package--manager-pnpm-blue.svg)](https://pnpm.io/)
[![Coverage](https://codecov.io/gh/eduardosaba/FabriSys/branch/main/graph/badge.svg)](https://codecov.io/gh/eduardosaba/FabriSys) <!-- Codecov badge is conditional on setting up CODECOV_TOKEN -->
[![Issues](https://img.shields.io/github/issues/eduardosaba/FabriSys.svg)](https://github.com/eduardosaba/FabriSys/issues)
[![Dependencies](https://img.shields.io/librariesio/release/github/eduardosaba/FabriSys.svg)](https://libraries.io/github/eduardosaba/FabriSys)
Front-end do sistema FabriSys desenvolvido com Next.js.

## Visão geral

Tecnologias principais:

- Next.js
- React 19
- pnpm (recomendado)
- Tailwind CSS
- GitHub Actions (CI)

## Pré-requisitos

- Node.js (recomendado v18+)
- pnpm (recomendado via Corepack) ou npm
- Git

Para ativar o pnpm via Corepack (recomendado):

```powershell
corepack enable
corepack prepare pnpm@latest --activate
```

## Como clonar e instalar

```powershell
git clone git@github.com:eduardosaba/FabriSys.git
cd FabriSys
pnpm install
```

Se preferir usar npm:

```powershell
npm ci
```

## Variáveis de ambiente

Existe um template em `.env.example`. Crie um arquivo `.env.local` a partir dele e preencha os valores:

```powershell
copy .env.example .env.local
# ou no bash: cp .env.example .env.local
```

Não comite arquivos `.env` com segredos — eles estão ignorados pelo `.gitignore`.

## Rodando em desenvolvimento

```powershell
pnpm dev
# ou: npm run dev
```

Abra http://localhost:3000 no navegador.

## Build e produção

```powershell
pnpm build
pnpm start
# ou: npm run build && npm start
```

## Scripts úteis

- `dev` — inicia o servidor de desenvolvimento
- `build` — cria o build de produção
- `start` — inicia a aplicação em modo de produção
- `lint` — roda o ESLint
- `type-check` — verifica tipos TypeScript rapidamente (sem gerar arquivos)
- `type-check:watch` — verifica tipos em modo watch
- `type-check:strict` — verificação rigorosa de tipos

Execute testes e lint se existirem no projeto:

```powershell
pnpm test --if-present
pnpm lint
```

### Verificação de Tipos TypeScript

Para verificar rapidamente se há erros de tipo sem fazer o build completo:

```powershell
pnpm type-check
```

Para verificação contínua durante desenvolvimento:

```powershell
pnpm type-check:watch
```

Para verificação mais rigorosa (recomendado antes de commits):

```powershell
pnpm type-check:strict
```

Esses comandos são muito mais rápidos que `pnpm build` pois não geram arquivos JavaScript, apenas verificam os tipos.

## Git, SSH e remotes

- Recomendo usar SSH para push/clone sem senha. Exemplo de geração de chave:

```bash
ssh-keygen -t ed25519 -C "seu.email@example.com" -f ~/.ssh/id_ed25519
```

- Cole a chave pública (`~/.ssh/id_ed25519.pub`) em: https://github.com/settings/ssh-new
- Se usar múltiplas chaves, veja `ssh-config-exemplo.txt` no repositório como referência.

## Integração contínua (CI)

Há um workflow básico em `.github/workflows/ci.yml` que instala dependências com pnpm, faz build e executa testes em pushes/PRs na branch `main`.

Adicione segredos no GitHub (Repository → Settings → Secrets) conforme necessário para deploy/integrações.

Observação: existe um arquivo `codecov.yml` na raiz com a política de cobertura (target 80%). Após cadastrar o repositório no Codecov, adicione o secret `CODECOV_TOKEN` (Repository → Settings → Secrets → Actions) para permitir upload seguro da cobertura quando necessário.

## Boas práticas e próximos passos

1. Configurar ESLint + Prettier e Husky para manter consistência de código (posso configurar isto para você).
2. Criar/atualizar scripts de migração e documentação do banco de dados, se houver backend.
3. Proteger a branch `main` no GitHub exigindo checks do CI.

## Como contribuir

1. Crie branches por funcionalidade (`feature/minha-nova-funcionalidade`) e abra PRs para `main`.
2. Antes de commitar, rode os checks locais (format/lint/test). Os hooks Husky devem rodar automaticamente se configurados.
3. Peça revisão de pelo menos uma pessoa e aguarde a aprovação antes de mergear.

### Checklist de PR rápida

- [ ] O PR tem um título claro e descrição concisa
- [ ] Você linkou a issue relacionada (quando aplicável)
- [ ] Rodei `pnpm format --check` e `pnpm lint` localmente
- [ ] Testes relevantes foram adicionados/atualizados e `pnpm test` passa
- [ ] Não há segredos ou credenciais no PR

---

---

Arquivo atualizado com instruções em Português (pt-BR).
