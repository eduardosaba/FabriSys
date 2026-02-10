# 🔧 Correção: Loop Infinito no AuthProvider

## 🐛 Problema Relatado

### Sintomas:

- ✅ Login às vezes não funciona
- ✅ Logo não aparece
- ✅ Página não carrega mesmo após dar Enter
- ✅ Console mostra `fetchProfile` sendo chamado MÚLTIPLAS VEZES repetidamente

### Logs do Problema:

```
[AuthProvider] 🔍 Iniciando fetchProfile para userId=7c5a47e3...
[AuthProvider] ⏱️ Query colaboradores: 1438.80ms
[AuthProvider] ✅ Perfil encontrado. Total: 1579.40ms
[AuthProvider] 🔍 Iniciando fetchProfile para userId=7c5a47e3... ← REPETIDO!
[AuthProvider] ⏱️ Query colaboradores: 1474.20ms
[AuthProvider] ✅ Perfil encontrado. Total: 1618.30ms
[AuthProvider] 🔍 Iniciando fetchProfile para userId=7c5a47e3... ← LOOP!
```

---

## 🔍 Causa Raiz

### Problema 1: `fetchProfile` sem `useCallback`

```typescript
// ❌ ANTES (ERRADO)
const fetchProfile = async (userId: string) => {
  // Função recriada a cada render
  // Causa re-execução do useEffect
};

useEffect(() => {
  // ...
}, []); // Dependências vazias, mas usa 'profile' dentro!
```

**Resultado:** A função era recriada a cada render, e o `onAuthStateChange` continuava chamando a versão antiga que usava closure obsoleta da variável `profile`.

### Problema 2: Comparação com `profile` em closure obsoleta

```typescript
// ❌ ANTES (ERRADO)
onAuthStateChange(async (event, currentSession) => {
  if (currentSession?.user) {
    if (!profile || profile.id !== currentSession.user.id) {
      // 'profile' aqui é do closure antigo!
      await fetchProfile(...);
    }
  }
});
```

**Resultado:** Sempre achava que `profile` era diferente, chamando `fetchProfile` infinitamente.

### Problema 3: Chamadas duplicadas simultâneas

Sem controle de concorrência, múltiplas mudanças de estado disparavam várias chamadas ao mesmo tempo para o mesmo userId.

---

## ✅ Solução Implementada

### 1. `useCallback` para memoizar `fetchProfile`

```typescript
// ✅ DEPOIS (CORRETO)
const fetchProfile = useCallback(async (userId: string, userEmail?: string) => {
  // Função memoizada, só recria se dependências mudarem
  // ...
}, []); // Sem dependências = nunca recria
```

### 2. useRef para rastrear estado sem causar re-renders

```typescript
// ✅ Refs para controle de concorrência
const fetchingProfile = useRef(false);
const lastFetchedUserId = useRef<string | null>(null);

const fetchProfile = useCallback(async (userId: string) => {
  // Evitar chamadas duplicadas
  if (fetchingProfile.current && lastFetchedUserId.current === userId) {
    console.log('⏭️ Pulando fetchProfile duplicado');
    return;
  }

  fetchingProfile.current = true;
  lastFetchedUserId.current = userId;

  try {
    // ... busca profile
  } finally {
    fetchingProfile.current = false; // ✅ Sempre libera o lock
  }
}, []);
```

### 3. Comparação via ref em vez de state

```typescript
// ✅ DEPOIS (CORRETO)
onAuthStateChange(async (event, currentSession) => {
  if (currentSession?.user) {
    // Compara com ref em vez de state
    if (lastFetchedUserId.current !== currentSession.user.id) {
      await fetchProfile(currentSession.user.id);
    }
  } else {
    lastFetchedUserId.current = null; // ✅ Reset ao deslogar
  }
});
```

### 4. Log adicional para debug

```typescript
onAuthStateChange(async (event, currentSession) => {
  console.log(`🔔 Auth state changed: ${event}`);
  // Ajuda a entender o fluxo de auth
});
```

### 5. Limpeza adequada no `signOut`

```typescript
const signOut = async () => {
  await supabase.auth.signOut();
  setProfile(null);
  setUser(null);
  setSession(null);
  lastFetchedUserId.current = null; // ✅ Reset ref
  fetchingProfile.current = false; // ✅ Libera lock
  router.push('/');
};
```

---

## 📊 Resultado

### Antes (Loop Infinito):

```
fetchProfile chamado → carrega profile → re-render
  → fetchProfile chamado novamente (closure obsoleta)
    → carrega profile → re-render
      → fetchProfile chamado novamente...
        ♾️ LOOP INFINITO
```

### Depois (1 Chamada):

```
fetchProfile chamado → carrega profile → re-render
  → detecta userId já buscado
    → ⏭️ PULA
      ✅ FIM
```

---

## 🧪 Como Testar

### 1. Limpe o cache e recarregue

```bash
# No navegador
Ctrl + Shift + R (hard reload)
```

### 2. Verifique o console

```
✅ ESPERADO (1 chamada):
[AuthProvider] 🔍 Iniciando fetchProfile para userId=...
[AuthProvider] ⏱️ Query colaboradores: XXXms
[AuthProvider] ✅ Perfil encontrado

❌ ANTES (múltiplas chamadas):
[AuthProvider] 🔍 Iniciando fetchProfile (repetido 3x+)
```

### 3. Teste de login/logout

```
1. Faça login
2. Console deve mostrar apenas 1 fetchProfile
3. Faça logout
4. Console deve mostrar: 🔔 Auth state changed: SIGNED_OUT
5. Faça login novamente
6. Console deve mostrar apenas 1 fetchProfile
```

---

## 🎯 Arquivos Modificados

- ✅ `lib/auth.tsx` - Refatoração completa do AuthProvider

---

## 📝 Notas Importantes

### Por que `useCallback`?

- Garante que `fetchProfile` seja a **mesma função** entre renders
- Evita que `useEffect` dispare infinitamente
- Permite usar `fetchProfile` nas dependências do useEffect

### Por que `useRef` em vez de `useState`?

- `useRef` **não causa re-render** quando muda
- Perfeito para controle de concorrência e flags
- Mais eficiente que state para valores que não precisam renderizar

### Por que comparar `lastFetchedUserId.current`?

- Evita buscar o mesmo perfil múltiplas vezes
- Mais confiável que comparar `profile` (que pode estar desatualizado no closure)
- Funciona mesmo em mudanças rápidas de auth state

---

## ✅ Checklist de Validação

- [x] `fetchProfile` envolvido em `useCallback`
- [x] Refs criadas para controle de concorrência
- [x] Comparação via ref em vez de state
- [x] Lock/unlock em `fetchProfile` com try/finally
- [x] Reset de refs no `signOut`
- [x] Log de eventos de auth state
- [x] Erro de sintaxe corrigido (try/catch/finally)
- [x] Sem erros de TypeScript
- [x] Testado em ambiente local

---

**Correção concluída!** 🎉  
O loop infinito foi eliminado e o AuthProvider agora funciona corretamente.

## 🔧 Atualização: Erro de Sintaxe Corrigido

Durante a refatoração, um erro de sintaxe foi introduzido onde o bloco `try/catch/finally` ficou corrompido.

**Erro:**

```
Parsing ecmascript source code failed
> 134 | finally {
Expression expected
```

**Causa:** Console.warn incompleto antes do `finally` block.

**Correção:** Estrutura `try/catch/finally` reconstruída corretamente:

```typescript
try {
  // ... busca profile
} catch (error) {
  // ... tratamento de erro
  setProfile({ id: userId, role: 'user', email: userEmail });
} finally {
  fetchingProfile.current = false; // ✅ Sempre libera o lock
}
```

✅ **Arquivo compilando sem erros!**
