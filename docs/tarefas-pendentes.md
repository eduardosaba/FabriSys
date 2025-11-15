# Tarefas pendentes (03/11/2025)

## ✅ Autenticação e Controle de Acesso (FINALIZADO)

- [x] Sistema completo de login implementado
  - Página `/login` com formulário e validação
  - Redirecionamento baseado em roles (admin/fabrica/pdv)
  - Contexto de autenticação (`AuthProvider`)
  - Componente `AuthGuard` para proteção de rotas
  - Menu do usuário no header com logout
- [x] Migrações Supabase criadas
  - `018_create_profiles_table.sql`: Tabela profiles com RLS
  - `019_create_test_users.sql`: Usuários de teste para desenvolvimento
- [x] Build passando com 21 páginas (incluindo /login)

## Configuração e qualidade de código

- [x] Avisos do `pnpm run lint` resolvidos (0 errors, 0 warnings)
- [x] Regras type-aware do `typescript-eslint` habilitadas apenas para TS/TSX e em nível `warn`
- Confirmar se o `tailwind.config.cjs` ignorado no ESLint não precisa de validação adicional.

## Build e execução

- Subir o servidor com `pnpm run dev` para garantir que a migração dos arquivos `.mjs` -> `.cjs` resolveu o erro do `jiti`.
- Testar geração de PDFs após os ajustes de dependências.

## Próximos Passos (Módulo 2 - Produção/CMV)

Com a autenticação estabelecida, podemos prosseguir para:

1. **Executar migrações no Supabase**
2. **Testar fluxo de login** com usuários de teste
3. **Implementar Módulo 2**: Cadastro de produtos finais e ficha técnica
4. **Produção**: Ordens de produção com `responsavel_id` confiável

## Documentação

- Avaliar se outras guias de contribuição/README precisam mencionar o uso da configuração ESLint em `eslint.config.mjs`.
