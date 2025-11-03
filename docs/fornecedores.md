Para começar a usar fornecedores no sistema, siga os passos abaixo:

1. Primeiro, execute o script SQL de migração para atualizar a estrutura do banco de dados:

```sql
-- Em migrations/001_atualiza_fornecedores.sql
ALTER TABLE fornecedores
  DROP COLUMN contato,
  ADD COLUMN email text,
  ADD COLUMN telefone text,
  ADD COLUMN endereco text;
```

2. Após executar o script SQL, atualize a página principal de insumos (/dashboard/insumos/page.tsx) para incluir o link para fornecedores:

```tsx
<Link href="/dashboard/fornecedores">
  <Button variant="secondary">Fornecedores</Button>
</Link>
```

3. Na página de fornecedores (/dashboard/fornecedores/page.tsx):

- Lista todos os fornecedores cadastrados
- Permite adicionar novos fornecedores
- Permite editar fornecedores existentes
- Verifica dependências antes de excluir

4. Interface atualizada para fornecedores:

```typescript
export interface Fornecedor {
  id: string;
  nome: string;
  cnpj: string;
  email?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  created_at: string;
}
```
