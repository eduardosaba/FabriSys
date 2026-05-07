# 🧪 Guia de Teste - Persistência de Tema

## ✅ Checklist Pré-Teste

- [ ] Dev server rodando em `http://localhost:3000`
- [ ] Você está logado como admin ou master
- [ ] Abra DevTools (F12) → Console para monitorar logs

---

## 📋 Procedimento de Teste

### 1. **Abrir Configurações de Aparência**

```
URL: http://localhost:3000/dashboard/configuracoes
Aba: "Aparência"
```

### 2. **Aplicar um Tema (Opção A: Preset)**

- Clique em um preset (ex: "Verde Moderno")
- Observação esperada: cores mudam na preview
- Console deve mostrar: `saveScopedThemeColors.upsert.*` ou `saveScopedThemeColors.fallback.*`

### 3. **Ou Customizar Manualmente (Opção B)**

- Mude a cor de `sidebar_bg` para uma cor bem visível (ex: `#FF0000` para vermelho)
- Observe mudança em tempo real na sidebar

### 4. **Salvar Customização**

- Clique botão "Salvar Customização" ou "Salvar Predefinição"
- Espere toast de sucesso: ✅ "Customização salva com sucesso!"
- **Console deve mostrar logs:**
  ```
  saveScopedThemeColors.upsert.success: { ... }
  OU
  saveScopedThemeColors.fallback.insert: { ... }
  ```

### 5. **Validar Local Storage**

DevTools → Application → Local Storage → `theme-preference`

- [ ] Deve conter objeto JSON com as cores salvas
- [ ] Exemplo:
  ```json
  {
    "theme_mode": "light",
    "primary_color": "#4A2C2B",
    "sidebar_bg": "#FF0000",
    ...
  }
  ```

### 6. **Recarregar Página (F5)**

- [ ] As cores devem **persistir** (não reverter para padrão)
- [ ] Se reverteu: **PROBLEMA** na persistência
- [ ] Se persistiu: ✅ Continuamos

### 7. **Alternar Light/Dark Mode**

No header ou em Configurações:

- [ ] Clique para alternar para `dark` (se estava em `light`)
- [ ] Observe DevTools → Console para:
  ```
  applyTheme.apply: mode=dark, colors={ ... }
  ```
- [ ] Background deve mudar (CSS var `--background`)
- [ ] Se não mudou: **PROBLEMA** em aplicação de CSS vars

### 8. **Recarregar em Dark Mode (F5)**

- [ ] Dark mode deve manter-se
- [ ] Cores do dark mode devem aplicar
- [ ] Se reverteu para light: **PROBLEMA** em persistência de modo

### 9. **Alternar de Novo para Light**

- [ ] Colors originais (ou customizadas) devem aplicar
- [ ] Se mudou para cores padrão: **PROBLEMA**

---

## 🔍 Monitorar Logs no Console

### Logs Esperados ao Salvar:

```javascript
// ✅ Sucesso com UPSERT
saveScopedThemeColors.upsert.success: {
  user_id: "xxx",
  theme_mode: "light",
  primary_color: "#4A2C2B",
  ...
}

// ✅ Sucesso com FALLBACK (update/insert)
saveScopedThemeColors.fallback.select_found: row found, updating...
saveScopedThemeColors.fallback.update: {
  user_id: "xxx",
  theme_mode: "light",
  ...
}

// ❌ Erro RLS/Auth
saveScopedThemeColors.error: POLICY: row-level security (RLS)...
```

### Logs Esperados ao Alternar Modo:

```javascript
// Ao alternar para dark
applyTheme.apply: {
  mode: "dark",
  colors: { ... },
  ".dark" class: added
}

// CSS vars sendo setadas
document.documentElement.setProperty: --background → #4a2c2b
document.documentElement.setProperty: --sidebar-bg → #...
```

---

## 🚨 Se Algo Falhar

### Caso 1: Cores Reverteram Após Refresh

**Problema:** Persistência não funcionou

- [ ] Verifique logs: há erro em `saveScopedThemeColors`?
- [ ] Abra Supabase Dashboard → SQL Editor:
  ```sql
  SELECT * FROM user_theme_colors
  WHERE user_id = '<your-user-id>'
  LIMIT 5;
  ```
- [ ] Se vazio: `saveScopedThemeColors` não gravou
- [ ] Se preenchido: problema em `initializeTheme` (leitura)

### Caso 2: Dark Mode Não Muda Background

**Problema:** CSS vars não são aplicadas por modo

- [ ] Verifique em DevTools → Elements → `:root`:
  ```css
  --background: <current-value> --dark-background: <expected-dark-value>;
  ```
- [ ] Se `--background` não mudar ao alternar: problema em `applyTheme`
- [ ] Se `.dark` class não é adicionada: problema em toggleTheme

### Caso 3: Toast "Persistência não confirmada"

**Problema:** SELECT pós-save falhou

- [ ] Pode ser RLS (Row-Level Security) restringindo acesso
- [ ] Verifique Supabase RLS policies na tabela `user_theme_colors`
- [ ] Confirme que `auth.uid()` retorna valor correto

---

## 📊 Checklist Final

| Teste         | Status | Observação                  |
| ------------- | ------ | --------------------------- |
| Aplicar tema  | [ ] ✅ | Cores mudam na UI           |
| Salvar        | [ ] ✅ | Toast sucesso + logs vistos |
| Local Storage | [ ] ✅ | theme-preference preenchido |
| Refresh       | [ ] ✅ | Cores persistem             |
| Dark mode     | [ ] ✅ | Background muda             |
| Refresh dark  | [ ] ✅ | Dark mode mantém            |
| Supabase      | [ ] ✅ | Dados em user_theme_colors  |

---

## 📸 Capturar Evidência

Se tudo passou ✅, ótimo! Se falhou ❌:

1. Tire screenshot do console (F12)
2. Copie os logs começando com `saveScopedThemeColors.*` ou `applyTheme.*`
3. Compartilhe comigo para debug
