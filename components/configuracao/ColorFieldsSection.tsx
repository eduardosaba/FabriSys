import { ThemeField } from './theme-config';

interface ColorFieldsSectionProps {
  availableFields: ThemeField[];
  settings: Record<string, string | number>;
  onFieldChange: (key: string, value: string | number) => void;
}

export function ColorFieldsSection({
  availableFields,
  settings,
  onFieldChange,
}: ColorFieldsSectionProps) {
  return (
    <div className="mb-6">
      <h3 className="mb-3 font-medium">Cores Principais</h3>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {availableFields.map(({ key, label, description }) => (
          <div key={key} className="flex flex-col">
            <label className="mb-1 text-sm font-medium">{label}</label>
            <p className="mb-2 text-xs text-gray-500">{description}</p>
            <input
              type="color"
              value={(settings[key] as string) || '#000000'}
              onChange={(e) => onFieldChange(key, e.target.value)}
              className="h-8 w-16 rounded border"
            />
            <div className="mt-2 flex items-center gap-3">
              <span className="ml-2 font-mono text-xs">
                {(settings[key] as string) || '#000000'}
              </span>
              <div className="text-xs text-gray-400">
                <div>
                  Propriedade: <span className="font-mono">{key}</span>
                </div>
                <div>
                  Caminho (por modo): <span className="font-mono">colors.light.{key}</span> /{' '}
                  <span className="font-mono">colors.dark.{key}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
