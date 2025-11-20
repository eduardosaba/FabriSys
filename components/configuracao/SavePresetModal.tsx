import React, { useState } from 'react';
import Button from '@/components/Button';
import Text from '@/components/ui/Text';

export default function SavePresetModal({
  open,
  onClose,
  onSave,
  defaultName,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (name: string) => void | Promise<void>;
  defaultName?: string;
}) {
  const [name, setName] = useState(defaultName || 'Minha Predefinição');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded bg-white p-6 shadow-lg">
        <Text variant="h3" className="mb-2">
          Salvar como predefinição
        </Text>
        <p className="mb-4 text-sm text-gray-600">
          Informe um nome para salvar a predefinição com as cores atuais. Você poderá aplicar esta
          predefinição futuramente.
        </p>

        <label className="mb-3 block text-sm font-medium text-gray-700">Nome</label>
        <input
          className="mb-4 w-full rounded border px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Nome da predefinição"
        />

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} className="px-4 py-2">
            Cancelar
          </Button>
          <Button
            className="px-4 py-2"
            onClick={() => {
              void onSave(name);
            }}
          >
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}
