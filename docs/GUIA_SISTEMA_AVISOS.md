# 📢 Sistema de Comunicados e Avisos em Tempo Real

## 📋 Visão Geral

Sistema completo de comunicação interna que permite ao administrador enviar mensagens urgentes que aparecem instantaneamente como popup modal na tela de usuários específicos ou de todos os usuários do sistema.

**Casos de uso:**

- 🔧 "Sistema entrará em manutenção às 18h"
- 🎉 "Nova promoção relâmpago: 20% de desconto nas próximas 2 horas"
- 📢 "Reunião geral obrigatória na sala de reuniões em 15 minutos"
- ⚠️ "Atenção Caixas: Não aceitar PIX por instabilidade do banco"
- 🚨 "Emergência: Evacuação do prédio"

---

## 🏗️ Arquitetura

### 1. Banco de Dados

**Tabela**: `avisos_sistema`

| Coluna       | Tipo        | Descrição                                                       |
| ------------ | ----------- | --------------------------------------------------------------- |
| `id`         | UUID        | Identificador único                                             |
| `mensagem`   | TEXT        | Texto do comunicado                                             |
| `tipo_alvo`  | TEXT        | Destinatários: `todos`, `admin`, `caixa`, `estoque`, `producao` |
| `cor_tipo`   | TEXT        | Estilo visual: `info` (azul), `warning` (amarelo)               |
| `ativo`      | BOOLEAN     | Se `false`, popup não aparece mais                              |
| `created_at` | TIMESTAMPTZ | Data/hora de criação                                            |
| `created_by` | UUID        | ID do admin que criou                                           |

**Recursos:**

- ✅ Row Level Security (RLS) habilitado
- ✅ **Realtime** ativado via `ALTER PUBLICATION supabase_realtime`
- ✅ Índices para otimização
- ✅ Políticas: Admins podem criar/editar, todos podem ler

---

### 2. Painel Administrativo

**Rota**: `/dashboard/admin/avisos`

**Arquivo**: `syslari/app/dashboard/admin/avisos/page.tsx`

**Funcionalidades:**

1. **Formulário de Envio**
   - Dropdown de destinatários (Todos, Admins, Caixas, Estoque, Produção)
   - Botões de tipo de alerta (Informativo/Importante)
   - Textarea para mensagem
   - Botão "Enviar Aviso Agora"

2. **Histórico de Avisos**
   - Lista dos últimos 10 avisos enviados
   - Badge indicando se está "Ativo na Tela"
   - Botão para encerrar aviso ativo
   - Data/hora de envio
   - Identificação visual por tipo de usuário

**Lógica de Envio:**

```typescript
// 1. Desativa avisos anteriores do mesmo tipo (evita acúmulo)
await supabase
  .from('avisos_sistema')
  .update({ ativo: false })
  .eq('ativo', true)
  .eq('tipo_alvo', alvo);

// 2. Insere novo aviso
await supabase.from('avisos_sistema').insert({
  mensagem,
  tipo_alvo: alvo,
  cor_tipo: tipoAlerta,
  ativo: true,
  created_by: profile?.id,
});
```

---

### 3. Componente Popup Global

**Arquivo**: `syslari/components/SystemAlertPopup.tsx`

**Como funciona:**

1. **Ao carregar a página**: Busca avisos ativos compatíveis com o role do usuário
2. **Verificação de "lido"**: Usa `localStorage` para não mostrar avisos já fechados
3. **Escuta Realtime**: Inscreve-se em mudanças na tabela `avisos_sistema`
   - `INSERT`: Novo aviso → mostra popup imediatamente
   - `UPDATE`: Aviso desativado → fecha popup automaticamente

**Interface do Popup:**

- 🎨 Cabeçalho colorido (azul para info, amarelo para warning)
- 📄 Conteúdo com quebras de linha preservadas
- ⏰ Data/hora de envio
- ✅ Botão "Entendi, fechar aviso"
- 🎵 Som de notificação (opcional, se existir `/sounds/notification.mp3`)

**Persistência:**

```typescript
// Marca aviso como visto no localStorage
localStorage.setItem(`aviso_visto_${aviso.id}`, 'true');
```

**Realtime Subscription:**

```typescript
const channel = supabase
  .channel('avisos-realtime')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'avisos_sistema' },
    (payload) => {
      const novoAviso = payload.new;
      if (
        novoAviso.ativo &&
        (novoAviso.tipo_alvo === 'todos' || novoAviso.tipo_alvo === profile?.role)
      ) {
        setAviso(novoAviso);
        setVisivel(true);
      }
    }
  )
  .subscribe();
```

---

### 4. Integração no Layout

**Arquivo**: `syslari/app/dashboard/layout.tsx`

**Modificação:**

```tsx
import SystemAlertPopup from '@/components/SystemAlertPopup';

// ... dentro do return, após o </div> principal:
<SystemAlertPopup />;
```

**Posição no DOM:**

- Z-index 9999 (acima de tudo)
- Fixed no viewport
- Backdrop blur para destaque

---

## 🚀 Instalação e Configuração

### Passo 1: Executar Migration SQL

No **Supabase SQL Editor**, execute:

```
syslari/migrations/012_setup_avisos_sistema.sql
```

**O que a migration faz:**

- ✅ Cria tabela `avisos_sistema`
- ✅ Habilita RLS com políticas
- ✅ Cria índices de performance
- ✅ **Ativa Realtime** na tabela

### Passo 2: Verificar Instalação

Execute no SQL Editor:

```sql
-- Verificar tabela
SELECT * FROM avisos_sistema;

-- Verificar Realtime ativado
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename = 'avisos_sistema';
```

### Passo 3: Testar Sistema

1. Faça login como **Admin**
2. Acesse `/dashboard/admin/avisos`
3. Envie um aviso para "Todos os Usuários"
4. Abra outra aba/janela como usuário comum
5. O popup deve aparecer **instantaneamente**

---

## 📖 Fluxo de Uso Completo

### Cenário 1: Manutenção Urgente

```
Admin:
1. Acessa /dashboard/admin/avisos
2. Seleciona "Todos os Usuários"
3. Tipo: "Importante" (alerta amarelo)
4. Mensagem: "Sistema entrará em manutenção às 18h. Salvem seu trabalho!"
5. Clica "Enviar Aviso Agora"

Todos os Usuários:
→ Popup amarelo aparece na tela
→ Usuário lê e clica "Entendi, fechar aviso"
→ Popup desaparece e não volta mais (localStorage)
```

### Cenário 2: Aviso Específico para PDV

```
Admin:
1. Seleciona "Operadores de Caixa (PDV)"
2. Tipo: "Importante"
3. Mensagem: "Não aceitar PIX nas próximas 2 horas por instabilidade do banco"
4. Envia

Operadores de Caixa:
→ Veem o popup
→ Param de aceitar PIX

Outros Usuários (Estoque, Produção):
→ Não veem nada (não é para eles)
```

### Cenário 3: Encerrar Aviso Antes do Prazo

```
Admin:
1. No histórico, vê aviso "Ativo na Tela"
2. Clica no botão de lixeira
3. Status muda para desativado

Usuários:
→ Popup fecha automaticamente via Realtime UPDATE
```

---

## 🔒 Segurança (RLS Policies)

### Leitura (SELECT)

```sql
CREATE POLICY "Users can read avisos"
  ON avisos_sistema FOR SELECT
  USING (auth.role() = 'authenticated');
```

👉 **Todos usuários autenticados** podem ler avisos (necessário para popup).

### Criação (INSERT)

```sql
CREATE POLICY "Admins can create avisos"
  ON avisos_sistema FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

👉 **Apenas admins** podem criar avisos.

### Atualização/Deleção (UPDATE/DELETE)

```sql
-- Similar ao INSERT, apenas admins
```

---

## 🎨 Customizações

### Adicionar Novo Tipo de Usuário

Em `app/dashboard/admin/avisos/page.tsx`:

```typescript
const TIPOS_USUARIO = [
  // ... existentes
  { value: 'financeiro', label: 'Setor Financeiro' },
  { value: 'vendas', label: 'Equipe de Vendas' },
];
```

Em `components/SystemAlertPopup.tsx`, a query já suporta automaticamente:

```typescript
.or(`tipo_alvo.eq.todos,tipo_alvo.eq.${profile.role}`)
```

### Adicionar Som de Notificação

1. Adicione arquivo de áudio em `syslari/public/sounds/notification.mp3`
2. O componente já tenta tocar automaticamente
3. Formatos suportados: MP3, OGG, WAV

### Mudar Cores do Popup

Em `SystemAlertPopup.tsx`:

```typescript
// Adicionar tipo 'erro' (vermelho)
const isWarning = aviso.cor_tipo === 'warning';
const isError = aviso.cor_tipo === 'erro';

<div className={`
  ${isWarning ? 'bg-yellow-500' : ''}
  ${isError ? 'bg-red-500' : 'bg-blue-600'}
`}>
```

---

## 📊 Monitoramento e Analytics

### Consultas SQL Úteis

**Avisos ativos no momento:**

```sql
SELECT * FROM avisos_sistema
WHERE ativo = true
ORDER BY created_at DESC;
```

**Histórico do último mês:**

```sql
SELECT
  mensagem,
  tipo_alvo,
  created_at,
  (SELECT email FROM auth.users WHERE id = created_by) as enviado_por
FROM avisos_sistema
WHERE created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;
```

**Contar avisos por tipo:**

```sql
SELECT tipo_alvo, COUNT(*) as total
FROM avisos_sistema
GROUP BY tipo_alvo;
```

---

## 🚀 Melhorias Futuras Sugeridas

1. **Agendamento de Avisos**
   - Campo `scheduled_for TIMESTAMPTZ`
   - Cron job para ativar no horário programado

2. **Multi-idioma**
   - Campo `mensagem_pt`, `mensagem_en`
   - Detectar idioma do usuário

3. **Confirmação de Leitura**
   - Tabela `avisos_leituras` (user_id, aviso_id, read_at)
   - Dashboard mostrando "5/10 usuários leram"

4. **Anexos**
   - Permitir upload de imagens/PDFs
   - Exibir no popup

5. **Templates**
   - Mensagens pré-prontas
   - "Manutenção programada", "Novo produto", etc.

6. **Push Notifications**
   - Integrar com Web Push API
   - Avisos chegam mesmo com navegador fechado

7. **Histórico Completo**
   - Página `/dashboard/admin/avisos/historico`
   - Filtros por data, tipo, status

---

## 🐛 Troubleshooting

### Popup não aparece

**Verificação 1: Realtime habilitado?**

```sql
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
```

Se `avisos_sistema` não aparecer, execute:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE avisos_sistema;
```

**Verificação 2: RLS permite leitura?**

```sql
-- Teste como usuário autenticado
SELECT * FROM avisos_sistema WHERE ativo = true;
```

**Verificação 3: Role do usuário correto?**

```typescript
console.log('Profile role:', profile?.role);
console.log('Aviso tipo_alvo:', aviso.tipo_alvo);
```

### Popup aparece duplicado

**Causa**: LocalStorage não marca como visto.

**Solução**: Limpe localStorage ou verifique se `aviso.id` está correto:

```javascript
localStorage.clear(); // No console do navegador
```

### Realtime não funciona

**Causa**: Supabase não está inscrito no canal.

**Solução**: Verifique no console do navegador:

```typescript
// Deve aparecer: "SUBSCRIBED" no status do canal
```

Se não funcionar, reinicie o servidor Next.js:

```powershell
pnpm dev
```

---

## 📝 Checklist de Implementação

- [x] Migration SQL executada
- [x] Tabela `avisos_sistema` criada
- [x] Realtime habilitado
- [x] RLS policies configuradas
- [x] Página admin criada (`/dashboard/admin/avisos`)
- [x] Componente `SystemAlertPopup` criado
- [x] Integrado no `layout.tsx`
- [x] Testado com usuário admin
- [x] Testado com usuário comum
- [x] Verificado funcionamento do Realtime
- [ ] (Opcional) Arquivo de som adicionado
- [ ] (Opcional) Menu sidebar atualizado com link para avisos

---

## 🎯 Métricas de Implementação

- **Arquivos criados**: 3
  - Migration SQL
  - Página admin
  - Componente popup
- **Arquivos modificados**: 1
  - Dashboard layout
- **Tabelas no banco**: 1
- **Policies RLS**: 4
- **Linhas de código**: ~400
- **Tempo estimado de setup**: 5 minutos

---

**Desenvolvido para FabriSys** 🏭  
**Sistema de Comunicação Interna em Tempo Real** 📢  
**Powered by Supabase Realtime** ⚡
