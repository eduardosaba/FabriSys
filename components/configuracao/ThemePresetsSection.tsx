import { ThemePreset } from './theme-config';
import { useTheme } from '@/lib/theme';

interface ThemePresetsSectionProps {
  presets: ThemePreset[];
  onApplyPreset: (preset: ThemePreset) => void;
}

export function ThemePresetsSection({ presets, onApplyPreset }: ThemePresetsSectionProps) {
  const { theme, resolvedTheme } = useTheme();

  // Determina o modo atual (se for 'system', usa o resolvido pelo navegador)
  const currentMode = theme.theme_mode === 'system' ? resolvedTheme : theme.theme_mode || 'light';

  return (
    <div className="mb-6">
      <h3 className="mb-3 font-medium">Predefinições de Tema</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {presets.map((preset) => {
          const colorsForMode = preset.colors[currentMode] || {};
          const colorEntries = Object.entries(colorsForMode);
          const previewColors = colorEntries.slice(0, 3);

          return (
            <div
              key={preset.key || preset.name}
              className="hover:border-primary/40 rounded-lg border p-4 transition-all hover:shadow-md bg-card"
            >
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-bold">{preset.name}</h4>
                <button
                  onClick={() => onApplyPreset(preset)}
                  className="bg-primary text-white hover:opacity-90 rounded px-3 py-1 text-xs font-medium transition-colors"
                >
                  Aplicar
                </button>
              </div>
              <p className="mb-3 text-[11px] text-muted-foreground leading-tight">
                {preset.description}
              </p>

              <div className="flex items-center gap-1.5">
                {previewColors.map(([key, color]) => (
                  <div
                    key={key}
                    className="h-5 w-5 rounded-full border shadow-sm"
                    style={{ backgroundColor: String(color) }}
                    title={`${key}: ${color}`}
                  />
                ))}
                {colorEntries.length > 3 && (
                  <span className="text-[10px] text-gray-400 font-medium">
                    +{colorEntries.length - 3}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
