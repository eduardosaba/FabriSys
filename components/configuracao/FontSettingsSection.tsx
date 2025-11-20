import { useTheme } from '@/lib/theme';
import Text from '@/components/ui/Text';

interface FontSettingsSectionProps {
  settings: Record<string, string | number>;
  onFieldChange: (key: string, value: string | number) => void;
}

export function FontSettingsSection({ settings, onFieldChange }: FontSettingsSectionProps) {
  const { theme } = useTheme();

  return (
    <div className="mb-6">
      <Text className="mb-3 font-medium">Fonte do Sistema</Text>
      <div className="flex gap-6 items-start">
        <div className="flex-1 max-w-md">
          <label className="mb-2 block text-sm font-medium">Fonte Principal</label>
          <div className="relative">
            <select
              value={(settings.font_family as string) || theme.font_family || 'Inter'}
              onChange={(e) => onFieldChange('font_family', e.target.value)}
              className="w-full appearance-none rounded-md border border-gray-300 px-3 py-2 pr-8 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              style={{
                fontFamily: (settings.font_family as string) || theme.font_family || 'Inter',
              }}
            >
              <option value="Inter" style={{ fontFamily: 'Inter' }}>
                Inter
              </option>
              <option value="Poppins" style={{ fontFamily: 'Poppins' }}>
                Poppins
              </option>
              <option value="Roboto" style={{ fontFamily: 'Roboto' }}>
                Roboto
              </option>
              <option value="Open Sans" style={{ fontFamily: 'Open Sans' }}>
                Open Sans
              </option>
              <option value="Lato" style={{ fontFamily: 'Lato' }}>
                Lato
              </option>
              <option value="Montserrat" style={{ fontFamily: 'Montserrat' }}>
                Montserrat
              </option>
              <option value="Nunito" style={{ fontFamily: 'Nunito' }}>
                Nunito
              </option>
              <option value="Ubuntu" style={{ fontFamily: 'Ubuntu' }}>
                Ubuntu
              </option>
              <option value="Crimson Text" style={{ fontFamily: 'Crimson Text' }}>
                Crimson Text
              </option>
              <option value="Playfair Display" style={{ fontFamily: 'Playfair Display' }}>
                Playfair Display
              </option>
              <option value="Lora" style={{ fontFamily: 'Lora' }}>
                Lora
              </option>
              <option value="Merriweather" style={{ fontFamily: 'Merriweather' }}>
                Merriweather
              </option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <svg
                className="h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            A fonte será aplicada em todo o sistema após salvar
          </p>
        </div>

        {/* Preview da fonte */}
        <div className="flex-1 max-w-md">
          <label className="mb-2 block text-sm font-medium">Preview</label>
          <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 min-h-[120px] flex flex-col justify-center">
            <div
              className="text-base leading-relaxed"
              style={{
                fontFamily: (settings.font_family as string) || theme.font_family || 'Inter',
              }}
            >
              <p className="font-bold mb-1">{theme.name || 'Confectio'}</p>
              <p className="text-sm mb-1">
                A B C D E F G H I J K L M N O P Q R S T U V W X Y Z
              </p>
              <p className="text-sm mb-1">
                a b c d e f g h i j k l m n o p q r s t u v w x y z
              </p>
              <p className="text-sm">0 1 2 3 4 5 6 7 8 9</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}