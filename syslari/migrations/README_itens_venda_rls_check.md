Checklist para inspeção RLS `itens_venda`

1) Comandos para listar policies atuais (execute no psql como DBA ou via Supabase SQL editor):

```sql
-- View policies via helper view
SELECT * FROM pg_policies WHERE schemaname = 'public' AND tablename = 'itens_venda';

-- More detailed from pg_policy
SELECT
  polname,
  polcmd,
  polroles,
  pg_get_expr(polqual, polrelid) AS using_expr,
  pg_get_expr(polwithcheck, polrelid) AS with_check_expr
FROM pg_policy
WHERE polrelid = 'public.itens_venda'::regclass;
```

2) Se a política bloquear INSERT, um exemplo de policy segura (ajuste conforme claims JWT / arquitetura):

```sql
-- Permitir inserts apenas quando a venda referenciada pertence à mesma org do JWT
CREATE POLICY insert_itens_venda_same_org ON public.itens_venda
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vendas v
      WHERE v.id = itens_venda.venda_id
        AND v.organization_id = current_setting('jwt.claims.organization_id')::uuid
    )
  );
```

3) SQL recomendado para inspecionar a RLS que impede operações e testar permissões como usuário 'authenticated' via Supabase SQL:

```sql
-- Simular INSERT (troque valores) — executado como role 'authenticated' no SQL editor
INSERT INTO public.itens_venda (venda_id, produto_id, quantidade, preco_unitario, subtotal, organization_id, usuario_id)
VALUES ('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000000',1,10,10,'00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000000');
```

4) Passos sugeridos para o DBA / responsável:
- Fazer backup do banco de staging antes de aplicar alterações.
- Executar os selects do passo (1) e compartilhar os resultados.
- Se as policies bloquearem INSERT, aplicar uma policy `WITH CHECK` que valide `venda_id` pertence à mesma org (exemplo no passo 2).
- Alternativa segura: aplicar a função `insert_venda_with_items` (arquivo `2026-02-14_create_venda_items_rpc.sql`) e executar testes com usuários autenticados.

5) Observações de segurança:
- Revise o owner da função `insert_venda_with_items` (owner deve ser um role de administração).
- Evite conceder permissões diretas amplas à tabela `itens_venda`; prefira políticas específicas ou funções `SECURITY DEFINER`.
