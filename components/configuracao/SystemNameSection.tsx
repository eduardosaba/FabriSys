interface SystemNameSectionProps {
  settings: Record<string, string | number>;
  onFieldChange: (key: string, value: string | number) => void;
}

export function SystemNameSection({ settings, onFieldChange }: SystemNameSectionProps) {
  return (
    <div className="mb-4">
      <label className="mb-2 block text-sm font-medium">Nome do Sistema</label>
      <input
        type="text"
        value={(settings.name as string) || 'Confectio'}
        onChange={(e) => onFieldChange('name', e.target.value)}
        className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        placeholder="Digite o nome do sistema"
      />
      <p className="mt-1 text-xs text-gray-500">
        Este nome aparecerá no cabeçalho, login e em todo o sistema
      </p>
    </div>
  );
}
