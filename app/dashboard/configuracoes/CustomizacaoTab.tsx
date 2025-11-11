import { useTheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Text from '@/components/ui/Text';
import Button from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

// Campos de customização para usuários admin (limitados)
const ADMIN_FIELDS = [
  {
    key: 'primary',
    label: 'Cor Principal do Tema',
    description: 'Usada em botões primários, realces e elementos de destaque',
  },
  {
    key: 'tituloPaginas',
    label: 'Título Página, Ícones, Setas',
    description: 'Cor de textos importantes na página e elementos de navegação',
  },
  {
    key: 'secondary',
    label: 'Cor Secundária',
    description: 'Usada em elementos complementares e estados secundários',
  },
  {
    key: 'accent',
    label: 'Cor de Destaque',
    description: 'Usada para elementos especiais e destaques',
  },
  { key: 'background', label: 'Cor de Fundo', description: 'Cor de fundo da interface principal' },
  { key: 'text', label: 'Cor do Texto', description: 'Cor padrão dos textos na interface' },
];

// Campos completos para usuários master (todas as cores disponíveis)
const MASTER_FIELDS = [
  {
    key: 'primary',
    label: 'Cor Principal do Tema',
    description: 'Usada em botões primários, realces e elementos de destaque',
  },
  {
    key: 'tituloPaginas',
    label: 'Título Página, Ícones, Setas',
    description: 'Cor de textos importantes na página e elementos de navegação',
  },
  {
    key: 'secondary',
    label: 'Cor Secundária',
    description: 'Usada em elementos complementares e estados secundários',
  },
  {
    key: 'accent',
    label: 'Cor de Destaque',
    description: 'Usada para elementos especiais e destaques',
  },
  { key: 'background', label: 'Cor de Fundo', description: 'Cor de fundo da interface principal' },
  { key: 'text', label: 'Cor do Texto', description: 'Cor padrão dos textos na interface' },
  {
    key: 'hover3Submenu',
    label: 'Hover Menu 3 Subníveis',
    description: 'Cor de hover para menus com 3 níveis',
  },
  {
    key: 'textoGeralHover',
    label: 'Texto Geral Hover',
    description: 'Cor de hover para textos gerais',
  },
  {
    key: 'bordasHeaderPerfil',
    label: 'Bordas Header/Perfil',
    description: 'Cor das bordas no header e perfil',
  },
  {
    key: 'bordasSelecaoListagens',
    label: 'Bordas Seleção Listagens',
    description: 'Cor das bordas em seleções de listagens',
  },
  {
    key: 'barraDashboard',
    label: 'Barra Dashboard',
    description: 'Cor da barra lateral do dashboard',
  },
  {
    key: 'barraDashboardHover',
    label: 'Barra Dashboard Hover',
    description: 'Cor de hover da barra lateral',
  },
  {
    key: 'receitasGraficos',
    label: 'Receitas em Gráficos',
    description: 'Cor para receitas nos gráficos',
  },
  {
    key: 'receitasGraficosSecundaria',
    label: 'Receitas Secundária',
    description: 'Cor secundária para receitas',
  },
  {
    key: 'despesasGraficos',
    label: 'Despesas em Gráficos',
    description: 'Cor para despesas nos gráficos',
  },
  {
    key: 'despesasGraficosSecundaria',
    label: 'Despesas Secundária',
    description: 'Cor secundária para despesas',
  },
  { key: 'barraRolagem', label: 'Barra de Rolagem', description: 'Cor da barra de rolagem' },
  {
    key: 'barraRolagemFundo',
    label: 'Fundo Barra Rolagem',
    description: 'Cor de fundo da barra de rolagem',
  },
  { key: 'fundoLinkEAD', label: 'Fundo Link EAD', description: 'Cor de fundo para links EAD' },
  { key: 'textoLinkEAD', label: 'Texto Link EAD', description: 'Cor do texto para links EAD' },
  { key: 'botaoSalvar', label: 'Botão Salvar', description: 'Cor do botão salvar' },
  {
    key: 'botaoSalvarAtivo',
    label: 'Botão Salvar Ativo',
    description: 'Cor do botão salvar quando ativo',
  },
  { key: 'botaoCancelar', label: 'Botão Cancelar', description: 'Cor do botão cancelar' },
  {
    key: 'botaoCancelarAtivo',
    label: 'Botão Cancelar Ativo',
    description: 'Cor do botão cancelar quando ativo',
  },
  { key: 'botaoPesquisar', label: 'Botão Pesquisar', description: 'Cor do botão pesquisar' },
  {
    key: 'botaoPesquisarAtivo',
    label: 'Botão Pesquisar Ativo',
    description: 'Cor do botão pesquisar quando ativo',
  },
  {
    key: 'camposObrigatorios',
    label: 'Campos Obrigatórios',
    description: 'Cor para campos obrigatórios',
  },
  {
    key: 'camposNaoObrigatorios',
    label: 'Campos Não Obrigatórios',
    description: 'Cor para campos não obrigatórios',
  },
  {
    key: 'barraSuperiorMenu',
    label: 'Barra Superior Menu',
    description: 'Cor da barra superior do menu',
  },
  {
    key: 'textoIconeAjuda',
    label: 'Texto Ícone Ajuda',
    description: 'Cor do texto do ícone de ajuda',
  },
  { key: 'iconeAjuda', label: 'Ícone Ajuda', description: 'Cor do ícone de ajuda' },
];

// Predefinições de temas disponíveis para admin
const THEME_PRESETS = [
  {
    name: 'Padrão Sistema',
    description: 'Tema padrão do sistema Lari',
    colors: {
      primary: '#4CAF50',
      tituloPaginas: '#ffffff',
      secondary: '#4f46e5',
      accent: '#f97316',
      background: '#ffffff',
      text: '#ffffff',
    },
  },
  {
    name: 'Azul Corporativo',
    description: 'Tema com tons de azul para ambiente corporativo',
    colors: {
      primary: '#1e40af',
      tituloPaginas: '#ffffff',
      secondary: '#3b82f6',
      accent: '#06b6d4',
      background: '#ffffff',
      text: '#ffffff',
    },
  },
  {
    name: 'Verde Natureza',
    description: 'Tema com tons de verde para ambiente natural',
    colors: {
      primary: '#059669',
      tituloPaginas: '#ffffff',
      secondary: '#10b981',
      accent: '#84cc16',
      background: '#ffffff',
      text: '#ffffff',
    },
  },
  {
    name: 'Roxo Elegante',
    description: 'Tema com tons de roxo para ambiente elegante',
    colors: {
      primary: '#7c3aed',
      tituloPaginas: '#ffffff',
      secondary: '#a855f7',
      accent: '#ec4899',
      background: '#ffffff',
      text: '#ffffff',
    },
  },
  {
    name: 'Laranja Energético',
    description: 'Tema com tons de laranja para ambiente energético',
    colors: {
      primary: '#ea580c',
      tituloPaginas: '#ffffff',
      secondary: '#f97316',
      accent: '#fbbf24',
      background: '#ffffff',
      text: '#ffffff',
    },
  },
];

export default function CustomizacaoTab() {
  const { theme, updateTheme, loading } = useTheme();
  const { profile } = useAuth();
  const isMasterAdmin = profile?.role === 'master';

  // Estado local para configurações
  const [settings, setSettings] = useState<Record<string, string | number>>({});
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [livePreview, setLivePreview] = useState(false);

  // Determinar quais campos mostrar baseado no tipo de usuário
  const availableFields = isMasterAdmin ? MASTER_FIELDS : ADMIN_FIELDS;

  // Inicializar configurações com valores atuais do tema
  useEffect(() => {
    const themeMode = theme.theme_mode;
    const themeColors = theme.colors;
    if (themeColors && typeof themeColors === 'object' && themeMode in themeColors) {
      const currentColors = themeColors[themeMode as keyof typeof themeColors];
      if (currentColors && typeof currentColors === 'object') {
        const initialSettings: Record<string, string | number> = {
          logo_url: theme.logo_url || '/logo.png',
          logo_scale: theme.logo_scale || 1,
        };

        // Adicionar todas as cores disponíveis baseado no tipo de usuário
        availableFields.forEach(({ key }) => {
          if (key in currentColors) {
            const colorValue = currentColors[key as keyof typeof currentColors];
            initialSettings[key] = typeof colorValue === 'string' ? colorValue : '#000000';
          }
        });

        setSettings(initialSettings);
      }
    }
  }, [theme, availableFields]);

  // Handler para mudanças nos campos
  const handleFieldChange = (key: string, value: string | number) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));

    // Aplicar mudanças em tempo real se preview estiver ativado
    if (livePreview && typeof value === 'string' && value.startsWith('#')) {
      const root = document.documentElement;
      const cssVar = `--${key}`;
      root.style.setProperty(cssVar, value);
    }
  };

  // Handler para upload de logo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('Iniciando upload do arquivo:', file.name, file.size);

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 2MB.');
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `user-logo-${profile?.id}-${Date.now()}.${fileExt}`;

      console.log('Fazendo upload para:', fileName);

      const { error } = await supabase.storage
        .from('public')
        .upload(fileName, file, { upsert: true });

      if (error) {
        console.error('Erro no upload:', error);
        throw error;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('public').getPublicUrl(fileName);

      console.log('URL pública gerada:', publicUrl);

      handleFieldChange('logo_url', publicUrl);

      // Limpar o input para permitir seleção do mesmo arquivo novamente
      e.target.value = '';

      toast.success('Logo atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload do logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  // Handler para aplicar predefinição
  const handleApplyPreset = (preset: (typeof THEME_PRESETS)[0]) => {
    const newSettings = { ...settings };
    Object.entries(preset.colors).forEach(([key, value]) => {
      newSettings[key] = value;
    });
    setSettings(newSettings);
    toast.success(`Predefinição "${preset.name}" aplicada!`);
  };

  // Toggle para preview em tempo real
  const toggleLivePreview = () => {
    setLivePreview(!livePreview);
    if (!livePreview) {
      // Se ativando preview, aplicar todas as configurações atuais
      Object.entries(settings).forEach(([key, value]) => {
        if (
          key !== 'logo_url' &&
          key !== 'logo_scale' &&
          typeof value === 'string' &&
          value.startsWith('#')
        ) {
          const root = document.documentElement;
          const cssVar = `--${key}`;
          root.style.setProperty(cssVar, value);
        }
      });
    } else {
      // Se desativando, restaurar cores originais do tema
      void updateTheme(theme, false, profile?.id);
    }
  };

  // Salvar customização
  const handleSave = async () => {
    try {
      const themeMode = theme.theme_mode;
      const themeColors = theme.colors;
      if (!themeColors || typeof themeColors !== 'object' || !(themeMode in themeColors)) return;

      const currentColors = themeColors[themeMode as keyof typeof themeColors];
      if (!currentColors || typeof currentColors !== 'object') return;

      // Preparar as configurações a serem salvas
      const updatedColors: Record<string, string> = { ...currentColors };
      const updatedSettings = { ...theme };

      // Separar cores e configurações de logo
      Object.entries(settings).forEach(([key, value]) => {
        if (key === 'logo_url') {
          updatedSettings.logo_url = value as string;
        } else if (key === 'logo_scale') {
          updatedSettings.logo_scale = value as number;
        } else if (typeof value === 'string') {
          updatedColors[key] = value;
        }
      });

      // Salvar configurações específicas do usuário admin
      await updateTheme(
        {
          ...updatedSettings,
          colors: {
            ...themeColors,
            [themeMode]: updatedColors,
          },
        },
        false,
        profile?.id
      );
    } catch (error) {
      console.error('Erro ao salvar customização:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Seção Admin da Marca - Customização Pessoal */}
      {(profile?.role === 'admin' || profile?.role === 'master') && (
        <Card className="p-6 border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2 mb-4">
            <Text variant="h3" className="text-primary">
              {isMasterAdmin ? '🎨 Configuração Completa do Tema' : '🎨 Minhas Cores Padrão'}
            </Text>
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
              {isMasterAdmin ? 'Master Admin - Controle Total' : 'Personalização Individual'}
            </span>
          </div>

          <div className="mb-4 text-sm text-gray-600">
            <div className="flex items-center justify-between">
              <p>
                {isMasterAdmin
                  ? 'Configure todas as cores e elementos visuais do sistema. Suas mudanças afetam toda a interface.'
                  : 'Personalize suas cores padrão que serão aplicadas em toda a interface do sistema.'}
              </p>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={livePreview}
                    onChange={toggleLivePreview}
                    className="rounded"
                  />
                  Preview em Tempo Real
                </label>
              </div>
            </div>
          </div>

          {/* Seção de Logo */}
          <div className="mb-6">
            <Text className="mb-3 font-medium">Logo Personalizado</Text>
            <div className="flex items-center gap-4 p-4 border rounded-lg bg-white">
              {settings.logo_url ? (
                <div className="w-12 h-12 flex items-center justify-center overflow-hidden rounded bg-white">
                  <img
                    src={settings.logo_url as string}
                    alt="Logo atual"
                    className="object-contain rounded"
                    style={{
                      width: `${48 * ((settings.logo_scale as number) || 1)}px`,
                      height: `${48 * ((settings.logo_scale as number) || 1)}px`,
                      maxWidth: '48px',
                      maxHeight: '48px',
                    }}
                  />
                </div>
              ) : (
                <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                  <span className="text-gray-400 text-xs">Logo</span>
                </div>
              )}
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2">Upload de Logo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
                <p className="text-xs text-gray-500 mt-1">Máximo 2MB. Formatos: PNG, JPG, SVG</p>
              </div>
            </div>

            {/* Escala do Logo */}
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Escala do Logo</label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={(settings.logo_scale as number) || 1}
                onChange={(e) => handleFieldChange('logo_scale', parseFloat(e.target.value))}
                className="w-full"
              />
              <p className="text-sm text-gray-500">
                {((settings.logo_scale as number) || 1).toFixed(1)}x
              </p>
            </div>
          </div>

          {/* Seção de Predefinições */}
          <div className="mb-6">
            <Text className="mb-3 font-medium">Predefinições de Tema</Text>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {THEME_PRESETS.map((preset, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{preset.name}</h4>
                    <button
                      onClick={() => handleApplyPreset(preset)}
                      className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 transition-colors"
                    >
                      Aplicar
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">{preset.description}</p>
                  <div className="flex gap-1">
                    {Object.entries(preset.colors)
                      .slice(0, 3)
                      .map(([key, color]) => (
                        <div
                          key={key}
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: color }}
                          title={`${key}: ${color}`}
                        />
                      ))}
                    {Object.keys(preset.colors).length > 3 && (
                      <div className="w-4 h-4 rounded border bg-gray-200 flex items-center justify-center">
                        <span className="text-xs text-gray-600">+</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Campos de customização pessoal do admin */}
          <div className="mb-6">
            <Text className="mb-3 font-medium">Cores Principais</Text>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {availableFields.map(({ key, label, description }) => (
                <div key={key} className="flex flex-col">
                  <label className="mb-1 font-medium text-sm">{label}</label>
                  <p className="text-xs text-gray-500 mb-2">{description}</p>
                  <input
                    type="color"
                    value={(settings[key] as string) || '#000000'}
                    onChange={(e) => handleFieldChange(key, e.target.value)}
                    className="w-16 h-8 border rounded"
                  />
                  <span className="ml-2 font-mono text-xs">
                    {(settings[key] as string) || '#000000'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Botão de salvar */}
      {(profile?.role === 'admin' || profile?.role === 'master') && (
        <div className="flex justify-center">
          <Button className="px-8 py-2" onClick={handleSave} disabled={loading || uploadingLogo}>
            {uploadingLogo ? 'Enviando Logo...' : loading ? 'Salvando...' : 'Salvar Customização'}
          </Button>
        </div>
      )}

      {/* Mensagem para usuários sem permissão */}
      {(!profile || (profile.role !== 'admin' && profile.role !== 'master')) && (
        <Card className="p-6 text-center">
          <Text variant="h3" className="text-gray-600 mb-2">
            🔒 Acesso Restrito
          </Text>
          <Text className="text-gray-500">
            Apenas usuários com permissão de Admin ou Master Admin podem acessar a customização
            visual.
          </Text>
        </Card>
      )}
    </div>
  );
}
