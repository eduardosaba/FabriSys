import Text from '@/components/ui/Text';

interface FooterSettingsSectionProps {
  settings: Record<string, string | number>;
  onFieldChange: (key: string, value: string | number) => void;
}

export function FooterSettingsSection({ settings, onFieldChange }: FooterSettingsSectionProps) {
  return (
    <div className="mb-6">
      <Text className="mb-3 font-medium">Configurações do Footer</Text>
      <p className="mb-3 text-sm text-gray-600">
        Personalize as informações exibidas no rodapé do sistema para suporte técnico e
        conformidade legal.
      </p>

      <div className="space-y-4 rounded-lg border bg-gray-50 p-4 dark:bg-gray-800 dark:border-gray-700">
        {/* Nome da Empresa para Copyright */}
        <div>
          <label className="mb-2 block text-sm font-medium">
            Nome da Empresa (Copyright)
          </label>
          <input
            type="text"
            value={(settings.footer_company_name as string) || 'Eduardo Saba'}
            onChange={(e) => onFieldChange('footer_company_name', e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Digite o nome da empresa"
          />
          <p className="mt-1 text-xs text-gray-500">
            Este nome aparecerá nos direitos autorais do footer
          </p>
        </div>

        {/* Versão do Sistema */}
        <div>
          <label className="mb-2 block text-sm font-medium">Versão do Sistema</label>
          <input
            type="text"
            value={(settings.footer_system_version as string) || '1.0.0'}
            onChange={(e) => onFieldChange('footer_system_version', e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Ex: 1.0.0"
          />
          <p className="mt-1 text-xs text-gray-500">
            Versão atual do sistema (crucial para suporte técnico)
          </p>
        </div>
      </div>
    </div>
  );
}