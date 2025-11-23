# Gerar `favicon.ico` no CI

Este arquivo explica como gerar o `favicon.ico` automaticamente no CI (ex.: GitHub Actions). O repositório já possui um script que gera as imagens PNG necessárias em `public/` — `scripts/generate-favicons.mjs` — que produz arquivos como `favicon-16x16.png`, `favicon-32x32.png` e `apple-touch-icon.png`.

Como `to-ico` foi removido do projeto por questões de segurança, seguem duas opções seguras para gerar o `favicon.ico` no runner do CI:

Opção A — Usando `png-to-ico` via `npx` (simples):

1. Execute o script que gera os PNGs:

```bash
pnpm install --frozen-lockfile
node scripts/generate-favicons.mjs
```

2. Gere o `favicon.ico` a partir dos PNGs:

```bash
npx png-to-ico public/favicon-16x16.png public/favicon-32x32.png > public/favicon.ico
```

Observações:

- `npx` baixará a ferramenta temporariamente no runner; isso mantém o `package.json` livre da dependência adicional.
- Se preferir evitar `npx`, instale `png-to-ico` como `devDependency` e rode `pnpm exec png-to-ico ...`.

Opção B — Usando `icotool` (ferramenta nativa no Ubuntu runner):

1. No GitHub Actions use um passo para instalar `icotool`:

```yaml
- name: Install icoutils
  run: sudo apt-get update; sudo apt-get install -y icoutils
```

2. Gere os PNGs e crie o `.ico`:

```bash
node scripts/generate-favicons.mjs
icotool -c -o public/favicon.ico public/favicon-16x16.png public/favicon-32x32.png
```

Exemplo de trecho do GitHub Actions (exemplo mínimo):

```yaml
name: Generate favicons
on: [push]
jobs:
  build-favicons:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 18
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      - name: Generate PNG favicons
        run: node scripts/generate-favicons.mjs
      - name: Create favicon.ico (png-to-ico via npx)
        run: npx png-to-ico public/favicon-16x16.png public/favicon-32x32.png > public/favicon.ico
      - name: Commit favicon
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add public/favicon.ico
          git commit -m "chore: add generated favicon.ico" || echo "no changes to commit"
          git push
```

Notas finais

- Recomendamos limitar esse job apenas a branches/PRs apropriados (ex.: `main` ou `release`) para evitar commits frequentes.
- Se preferir que o arquivo `favicon.ico` seja criado localmente por você e comitado manualmente (workflow atual), apenas gere os PNGs localmente e use um dos comandos acima para converter em `.ico`.
- Se precisar, eu posso adicionar um job de exemplo mais refinado para a sua pipeline CI — quer que eu crie esse job e o PR com o workflow de exemplo?

---

Arquivo gerado automaticamente pelo assistente — instruções curtas para CI.
