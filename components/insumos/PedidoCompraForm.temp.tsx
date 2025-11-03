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
  email?: string;
  telefone?: string;
  observacoes?: string;
}

export default function PedidoCompraForm({ itens, onSuccess }: PedidoCompraFormProps) {
  const [enviando, setEnviando] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>();
  const { toast } = useToast();

  const onSubmit = async (data: FormValues) => {
    if (!data.email && !data.telefone) {
      toast({
        title: 'Erro no formulário',
        description: 'Informe um email ou telefone para enviar o pedido',
        variant: 'error',
      });
      return;
    }

    setEnviando(true);
    try {
      if (data.email) {
        // Gerar o PDF e enviar por email
        const responsePdf = await fetch('/api/pdf/pedido-compra', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ itens }),
        });

        if (!responsePdf.ok) throw new Error('Erro ao gerar PDF do pedido');

        const pdfBuffer = await responsePdf.arrayBuffer();

        // Enviar por email
        const responseEmail = await fetch('/api/email/pedido-compra', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: data.email,
            pdfBuffer: Array.from(new Uint8Array(pdfBuffer)),
          }),
        });

        if (!responseEmail.ok) throw new Error('Erro ao enviar email');

        toast({
          title: 'Email enviado com sucesso',
          variant: 'success',
        });
      }

      if (data.telefone) {
        // Gerar o PDF e enviar por WhatsApp
        const responsePdf = await fetch('/api/pdf/pedido-compra', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ itens }),
        });

        if (!responsePdf.ok) throw new Error('Erro ao gerar PDF do pedido');

        const pdfBuffer = await responsePdf.arrayBuffer();

        // Upload do PDF
        const formData = new FormData();
        formData.append('file', new globalThis.Blob([pdfBuffer], { type: 'application/pdf' }));
        formData.append('path', `pedidos/${Date.now()}.pdf`);

        const responseUpload = await fetch('/api/storage/upload', {
          method: 'POST',
          body: formData,
        });

        if (!responseUpload.ok) throw new Error('Erro ao fazer upload do PDF');

        const { url } = await responseUpload.json();

        // Enviar por WhatsApp
        const responseWhatsApp = await fetch('/api/whatsapp/pedido-compra', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            telefone: data.telefone,
            pdfUrl: url,
          }),
        });

        if (!responseWhatsApp.ok) throw new Error('Erro ao enviar WhatsApp');

        toast({
          title: 'WhatsApp enviado com sucesso',
          variant: 'success',
        });
      }

      onSuccess?.();
    } catch (error) {
      console.error('Erro ao enviar pedido:', error);
      toast({
        title: 'Erro ao enviar pedido',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'error',
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Panel>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Text>Email do Fornecedor</Text>
          <input
            type="email"
            {...register('email')}
            placeholder="fornecedor@exemplo.com"
            className="w-full p-2 border rounded-md"
          />
          {errors.email && (
            <Text className="text-sm text-red-500 mt-1">{errors.email.message}</Text>
          )}
        </div>

        <div>
          <Text>WhatsApp do Fornecedor</Text>
          <input
            type="tel"
            {...register('telefone')}
            placeholder="(00) 00000-0000"
            className="w-full p-2 border rounded-md"
          />
          {errors.telefone && (
            <Text className="text-sm text-red-500 mt-1">{errors.telefone.message}</Text>
          )}
        </div>

        <div>
          <Text>Observações</Text>
          <textarea
            {...register('observacoes')}
            placeholder="Alguma observação adicional..."
            className="w-full p-2 border rounded-md"
            rows={3}
          />
        </div>

        <Button type="submit" variant="primary" className="w-full" disabled={enviando}>
          {enviando ? 'Enviando...' : 'Enviar Pedido'}
        </Button>
      </form>
    </Panel>
  );
}
