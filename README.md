# FabriSys

![CI](https://github.com/eduardosaba/FabriSys/actions/workflows/ci.yml/badge.svg)
![Lint](https://img.shields.io/badge/lint-eslint-brightgreen)

Este é o front-end do sistema FabriSys, criado com Next.js.

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

Execute testes e lint se existirem no projeto:

```powershell
pnpm test --if-present
pnpm lint
```

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

## Boas práticas e próximos passos

1. Configurar ESLint + Prettier e Husky para manter consistência de código (posso configurar isto para você).
2. Criar/atualizar scripts de migração e documentação do banco de dados, se houver backend.
3. Proteger a branch `main` no GitHub exigindo checks do CI.

## Como contribuir

- Crie branches por funcionalidade (`feature/minha-nova-funcionalidade`) e abra PRs para `main`.
- Antes de commitar, rode lint e testes. Considere habilitar hooks com Husky.

---

Arquivo atualizado com instruções em Português (pt-BR).
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
