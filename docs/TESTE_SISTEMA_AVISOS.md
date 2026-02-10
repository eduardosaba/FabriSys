# Exemplo de Teste do Sistema de Avisos

## Teste Rápido - Sistema de Comunicados

### 1. Executar Migration

No **Supabase SQL Editor**:

```sql
-- Cole e execute todo o conteúdo de:
-- syslari/migrations/012_setup_avisos_sistema.sql
```

### 2. Criar Aviso de Teste

**Via Interface Admin:**

1. Acesse: `http://localhost:3000/dashboard/admin/avisos`
2. Preencha:
   - Destinatário: `Todos os Usuários`
   - Tipo: `Informativo`
   - Mensagem: `🎉 Teste de comunicado em tempo real! O sistema está funcionando perfeitamente.`
3. Clique em **Enviar Aviso Agora**

**Via SQL (alternativa):**

```sql
INSERT INTO avisos_sistema (mensagem, tipo_alvo, cor_tipo, ativo)
VALUES (
  'Sistema de avisos funcionando! Esta é uma mensagem de teste.',
  'todos',
  'info',
  true
);
```

### 3. Verificar Popup

**Em outra aba/janela:**

1. Abra qualquer página do dashboard
2. O popup deve aparecer **imediatamente**
3. Clique em "Entendi, fechar aviso"
4. Recarregue a página → popup não deve aparecer de novo

### 4. Testar Realtime

**Teste de envio instantâneo:**

1. Mantenha 2 abas abertas lado a lado
2. Aba 1: Página de avisos (admin)
3. Aba 2: Qualquer outra página do dashboard
4. Na Aba 1, envie novo aviso
5. Na Aba 2, popup deve aparecer **sem precisar recarregar**

### 5. Testar Encerramento

**No painel admin:**

1. Veja o histórico de avisos
2. Clique no botão de **lixeira** do aviso ativo
3. Em outra aba aberta, o popup deve **fechar automaticamente**

### 6. Testar Segmentação

**Enviar para tipo específico:**

```sql
-- Aviso apenas para admins
INSERT INTO avisos_sistema (mensagem, tipo_alvo, cor_tipo, ativo)
VALUES ('Reunião de gestão às 15h', 'admin', 'warning', true);

-- Aviso apenas para caixas
INSERT INTO avisos_sistema (mensagem, tipo_alvo, cor_tipo, ativo)
VALUES ('Cuidado: Sistema de pagamento instável', 'caixa', 'warning', true);
```

Faça login com **usuário PDV** → deve ver apenas o aviso de caixa  
Faça login com **admin** → deve ver apenas o de admin

---

## Checklist de Validação

- [ ] Migration executada sem erros
- [ ] Tabela `avisos_sistema` existe
- [ ] Realtime habilitado (`supabase_realtime` publication)
- [ ] Popup aparece ao criar aviso
- [ ] Popup não reaparece após fechar (localStorage)
- [ ] Realtime funciona (popup aparece sem reload)
- [ ] Encerramento funciona (popup fecha automaticamente)
- [ ] Segmentação funciona (apenas destinatários corretos veem)
- [ ] Histórico mostra avisos corretamente
- [ ] Badge "Ativo na Tela" aparece nos avisos ativos

---

## Queries de Diagnóstico

**Verificar avisos ativos:**

```sql
SELECT * FROM avisos_sistema WHERE ativo = true;
```

**Verificar Realtime:**

```sql
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename = 'avisos_sistema';
```

**Verificar RLS:**

```sql
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'avisos_sistema';
```

**Limpar todos avisos (reset):**

```sql
DELETE FROM avisos_sistema;
```

---

## Problemas Comuns

### "Popup não aparece"

1. Verificar se Realtime está habilitado
2. Verificar role do usuário (`profile.role`)
3. Limpar localStorage do navegador

### "Erro de permissão ao criar aviso"

1. Verificar se usuário tem `role = 'admin'` na tabela `profiles`
2. Verificar policies RLS

### "Popup aparece várias vezes"

1. Limpar localStorage: `localStorage.clear()`
2. Verificar se há múltiplas inscrições do canal Realtime

---

**Teste concluído com sucesso?** ✅  
Seu sistema de comunicação interna está pronto para uso!
