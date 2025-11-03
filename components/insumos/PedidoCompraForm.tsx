'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Button from '@/components/Button';
import Text from '@/components/ui/Text';
import Panel from '@/components/ui/Panel';
import { useToast } from '@/hooks/useToast';
import { Insumo } from '@/lib/types/insumos';

interface PedidoCompraFormProps {
  itens: {
    insumo: Insumo;
    quantidade: number;
  }[];
  onSuccess?: () => void;
}

interface FormValues {
  observacoes?: string;
}

export default function PedidoCompraForm({ itens, onSuccess }: PedidoCompraFormProps) {
  const [salvando, setSalvando] = useState(false);
  const { register, handleSubmit } = useForm<FormValues>();
  const { toast } = useToast();

  const onSubmit = async (data: FormValues) => {
    if (!itens || itens.length === 0) {
      toast({ title: 'Adicione itens ao pedido', variant: 'warning' });
      return;
    }
    setSalvando(true);
    try {
      const resp = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itens, observacoes: data.observacoes }),
      });
      if (!resp.ok) throw new Error('Erro ao salvar pedido');
      toast({
        title: 'Pedido salvo',
        description: 'Você pode gerar o PDF na listagem.',
        variant: 'success',
      });
      onSuccess?.();
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao salvar pedido', variant: 'error' });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Panel>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Text>Observações</Text>
          <textarea
            {...register('observacoes')}
            placeholder="Alguma observação adicional..."
            className="w-full p-2 border rounded-md"
            rows={3}
          />
        </div>

        <Button type="submit" variant="primary" className="w-full" disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar Pedido'}
        </Button>
      </form>
    </Panel>
  );
}
