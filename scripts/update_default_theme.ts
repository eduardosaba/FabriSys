import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from .env.local
config({ path: join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Please check .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Tema padrão "Confectio Delicioso" com as cores especificadas
const defaultTheme = {
  name: 'Confectio Delicioso',
  logo_url: '/logo.png',
  logo_scale: 1.0,
  company_logo_url: undefined,
  company_logo_scale: 1.0,
  font_family: 'Inter',
  border_radius: '0.5rem',
  theme_mode: 'light' as const,
  density: 'comfortable' as const,
  footer_company_name: 'Confectio Delicioso',
  footer_system_version: '1.0.0',
  sidebar_bg: '#e9c4c2',
  sidebar_hover_bg: '#88544c',
  header_bg: '#e9c4c2',
  colors: {
    light: {
      primary: '#88544c',
      tituloPaginas: '#4a2c2b',
      secondary: '#e9c4c2',
      accent: '#f97316',
      background: '#f5e4e2',
      text: '#4a2c2b',
      hover3Submenu: '#e9c4c2',
      textoGeralHover: '#88544c',
      bordasHeaderPerfil: '#e9c4c2',
      bordasSelecaoListagens: '#88544c',
      barraDashboard: '#88544c',
      barraDashboardHover: '#4a2c2b',
      receitasGraficos: '#88544c',
      receitasGraficosSecundaria: '#e9c4c2',
      despesasGraficos: '#D32F2F',
      despesasGraficosSecundaria: '#E57373',
      barraRolagem: '#88544c',
      barraRolagemFundo: '#f5e4e2',
      fundoLinkEAD: '#88544c',
      textoLinkEAD: '#4a2c2b',
      botaoSalvar: '#88544c',
      botaoSalvarAtivo: '#4a2c2b',
      botaoSalvarDesabilitado: '#9ca3af',
      botaoCancelar: '#E74C3C',
      botaoCancelarAtivo: '#C0392B',
      botaoCancelarDesabilitado: '#d1d5db',
      botaoPesquisar: '#4a2c2b',
      botaoPesquisarAtivo: '#4a2c2b',
      botaoPesquisarDesabilitado: '#d1d5db',
      camposObrigatorios: '#F1C40F',
      camposNaoObrigatorios: '#f3f4f6',
      barraSuperiorMenu: '#88544c',
      textoIconeAjuda: '#374151',
      iconeAjuda: '#88544c',
    },
    dark: {
      primary: '#e9c4c2',
      tituloPaginas: '#f2e8e3',
      secondary: '#88544c',
      accent: '#f97316',
      background: '#4a2c2b',
      text: '#f2e8e3',
      hover3Submenu: '#e9c4c2',
      textoGeralHover: '#f2e8e3',
      bordasHeaderPerfil: '#88544c',
      bordasSelecaoListagens: '#e9c4c2',
      barraDashboard: '#88544c',
      barraDashboardHover: '#f2e8e3',
      receitasGraficos: '#e9c4c2',
      receitasGraficosSecundaria: '#88544c',
      despesasGraficos: '#ef4444',
      despesasGraficosSecundaria: '#f87171',
      barraRolagem: '#e9c4c2',
      barraRolagemFundo: '#4a2c2b',
      fundoLinkEAD: '#e9c4c2',
      textoLinkEAD: '#f2e8e3',
      botaoSalvar: '#e9c4c2',
      botaoSalvarAtivo: '#f2e8e3',
      botaoSalvarDesabilitado: '#6b7280',
      botaoCancelar: '#ef4444',
      botaoCancelarAtivo: '#f87171',
      botaoCancelarDesabilitado: '#9ca3af',
      botaoPesquisar: '#4a2c2b',
      botaoPesquisarAtivo: '#4a2c2b',
      botaoPesquisarDesabilitado: '#9ca3af',
      camposObrigatorios: '#fbbf24',
      camposNaoObrigatorios: '#374151',
      barraSuperiorMenu: '#88544c',
      textoIconeAjuda: '#9ca3af',
      iconeAjuda: '#e9c4c2',
    },
  },
};

async function updateDefaultTheme() {
  try {
    console.log('Atualizando tema padrão do sistema para "Confectio Delicioso"...');

    // Verificar configurações existentes
    const { data: existingSettings, error: fetchError } = await supabase
      .from('system_settings')
      .select('*')
      .eq('key', 'theme');

    if (fetchError) {
      console.error('Erro ao buscar configurações existentes:', fetchError);
      return;
    }

    console.log('Configurações existentes encontradas:', existingSettings?.length || 0);

    // Atualizar ou inserir o tema padrão
    const { data, error } = await supabase
      .from('system_settings')
      .upsert({
        key: 'theme',
        value: defaultTheme,
        updated_at: new Date().toISOString(),
      })
      .select();

    if (error) {
      console.error('Erro ao atualizar tema padrão:', error);
      return;
    }

    console.log('✅ Tema padrão atualizado com sucesso!');
    console.log('Tema "Confectio Delicioso" definido como padrão do sistema.');
    console.log('Dados atualizados:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Erro geral ao atualizar tema:', error);
  }
}

void updateDefaultTheme();
