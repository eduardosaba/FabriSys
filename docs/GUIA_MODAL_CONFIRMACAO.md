# Como Usar o Modal de Confirmação Personalizado

## Componentes Criados

1. **ConfirmDialog** (`components/ui/ConfirmDialog.tsx`) - Modal reutilizável
2. **useConfirm** (`hooks/useConfirm.ts`) - Hook para facilitar o uso

## Exemplo de Uso

### 1. Importar

```tsx
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';
```

### 2. Inicializar o hook no componente

```tsx
export default function MinhaPage() {
  const confirmDialog = useConfirm();

  // ... resto do código
}
```

### 3. Usar em funções assíncronas

**ANTES (com window.confirm):**

```tsx
const handleDelete = async (id: string) => {
  if (!confirm('Tem certeza que deseja excluir?')) return;

  // código de exclusão
  await supabase.from('tabela').delete().eq('id', id);
  toast.success('Excluído!');
};
```

**DEPOIS (com modal customizado):**

```tsx
const handleDelete = async (id: string) => {
  const confirmed = await confirmDialog.confirm({
    title: 'Confirmar Exclusão',
    message: 'Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.',
    confirmText: 'Excluir',
    cancelText: 'Cancelar',
    variant: 'danger', // 'danger' | 'warning' | 'info'
  });

  if (!confirmed) return;

  // código de exclusão
  await supabase.from('tabela').delete().eq('id', id);
  toast.success('Excluído!');
};
```

### 4. Adicionar o componente no JSX (antes do fechamento do div principal)

```tsx
return (
  <div>
    {/* Seu conteúdo aqui */}

    <ConfirmDialog
      isOpen={confirmDialog.isOpen}
      onClose={confirmDialog.handleCancel}
      onConfirm={confirmDialog.handleConfirm}
      title={confirmDialog.options.title}
      message={confirmDialog.options.message}
      confirmText={confirmDialog.options.confirmText}
      cancelText={confirmDialog.options.cancelText}
      variant={confirmDialog.options.variant}
    />
  </div>
);
```

## Variantes Disponíveis

- **danger** (vermelho) - Para ações destrutivas como excluir
- **warning** (laranja) - Para ações que requerem atenção
- **info** (azul) - Para confirmações informativas

## Páginas Já Atualizadas

✅ `/dashboard/agenda` - Exclusão de tarefas
✅ `/dashboard/configuracoes/usuarios` - Remoção de usuários

## Páginas Pendentes (substituir window.confirm)

- `/dashboard/producao/fichas-tecnicas` (linha 229)
- `/dashboard/insumos/cadastro` (linha 148)
- `/dashboard/insumos/pedidos-compra` (linha 505)
- `/dashboard/insumos/categorias` (linha 117)
- `/dashboard/pdv/controle-caixa` (linha 213)
- `/dashboard/fornecedores` (linha 192)
- `/dashboard/configuracoes/lojas` (linha 49)
- `/dashboard/configuracoes/promocoes` (linha 93)

## Benefícios

✅ Design consistente com o sistema
✅ Responsivo (touch-friendly em mobile)
✅ Acessível (aria-labels)
✅ Customizável (cores, textos)
✅ Não bloqueia a thread (async/await)
✅ Sem dependência do navegador
