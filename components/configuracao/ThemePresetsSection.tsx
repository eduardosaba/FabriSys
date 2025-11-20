import { ThemePreset } from './theme-config';
import { useTheme } from '@/lib/theme';

interface ThemePresetsSectionProps {
  presets: ThemePreset[];
  onApplyPreset: (preset: ThemePreset) => void;
}

export function ThemePresetsSection({ presets, onApplyPreset }: ThemePresetsSectionProps) {
  const { theme } = useTheme();

  return (
    <div className="mb-6">
      <h3 className="mb-3 font-medium">Predefinições de Tema</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {presets.map((preset, index) => (
          <div
            key={index}
            className="hover:border-primary/30 rounded-lg border p-4 transition-colors"
          >
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-medium">{preset.name}</h4>
              <button
                onClick={() => onApplyPreset(preset)}
                className="bg-primary/10 hover:bg-primary/20 rounded px-2 py-1 text-xs text-primary transition-colors"
              >
                Aplicar
              </button>
            </div>
            <p className="mb-3 text-xs text-gray-600">{preset.description}</p>
            <div className="flex gap-1">
              {(() => {
                const currentThemeMode = theme.theme_mode || 'light';
                const currentColors =
                  preset.colors[currentThemeMode as keyof typeof preset.colors] || {};
                return Object.entries(currentColors)
                  .slice(0, 3)
                  .map(([key, color]) => {
                    const colorValue = typeof color === 'string' ? color : String(color);
                    return (
                      <div
                        key={key}
                        className="h-4 w-4 rounded border"
                        style={{ backgroundColor: colorValue }}
                        title={`${key}: ${colorValue}`}
                      />
                    );
                  });
              })()}
              {(() => {
                const currentThemeMode = theme.theme_mode || 'light';
                const currentColors =
                  preset.colors[currentThemeMode as keyof typeof preset.colors] || {};
                return (
                  Object.keys(currentColors).length > 3 && (
                    <div className="flex h-4 w-4 items-center justify-center rounded border bg-gray-200">
                      <span className="text-xs text-gray-600">+</span>
                    </div>
                  )
                );
              })()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}