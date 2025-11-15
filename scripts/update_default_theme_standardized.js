import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from .env.local
config({ path: join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Please check .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Tema padrão "Confectio" com as cores padronizadas do CustomizacaoTab.tsx
const defaultTheme = {
  name: 'Confectio Delicioso',
  logo_url: '/logo.png',
  logo_scale: 1.0,
  company_logo_url: undefined,
  company_logo_scale: 1.0,
  font_family: 'Inter',
  border_radius: '0.5rem',
  theme_mode: 'light',
  density: 'comfortable',
  footer_company_name: 'Confectio Delicioso',
  footer_system_version: '1.0.0',
  sidebar_bg: '#e9c4c2',
  sidebar_hover_bg: '#88544c',
  header_bg: '#e9c4c2',
  colors: {
    light: {
      primary: '#88544c', // Caramelo - Botões, Links
      tituloPaginas: '#4a2c2b', // Chocolate Escuro
      secondary: '#e9c4c2', // Rosa Claro - Destaques suaves
      accent: '#88544c',
      background: '#f5e4e2', // Pêssego Claro - Fundo Geral
      text: '#4a2c2b',
      hover3Submenu: '#88544c',
      textoGeralHover: '#4a2c2b',
      bordasHeaderPerfil: '#e9c4c2',
      bordasSelecaoListagens: '#88544c',
      barraDashboard: '#88544c',
      barraDashboardHover: '#4a2c2b',
      receitasGraficos: '#88544c',
      receitasGraficosSecundaria: '#e9c4c2',
      despesasGraficos: '#dc2626', // Vermelho Padrão
      despesasGraficosSecundaria: '#ef4444', // Vermelho Padrão
      barraRolagem: '#88544c',
      barraRolagemFundo: '#f5e4e2',
      fundoLinkEAD: '#88544c',
      textoLinkEAD: '#4a2c2b',
      botaoSalvar: '#88544c',
      botaoSalvarAtivo: '#4a2c2b',
      botaoSalvarDesabilitado: '#9ca3af',
      botaoCancelar: '#dc2626',
      botaoCancelarAtivo: '#b91c1c',
      botaoCancelarDesabilitado: '#d1d5db',
      botaoPesquisar: '#059669', // Verde Padrão
      botaoPesquisarAtivo: '#047857', // Verde Padrão
      botaoPesquisarDesabilitado: '#d1d5db',
      camposObrigatorios: '#f59e0b', // Laranja Padrão
      camposNaoObrigatorios: '#f3f4f6',
      barraSuperiorMenu: '#88544c',
      textoIconeAjuda: '#374151',
      iconeAjuda: '#88544c',
    },
    dark: {
      primary: '#e9c4c2', // Rosa Claro - Destaque em fundo escuro
      tituloPaginas: '#f2e8e3', // Branco Suave
      secondary: '#88544c', // Caramelo
      accent: '#e9c4c2',
      background: '#4a2c2b', // Chocolate Escuro - Fundo Geral
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
      botaoPesquisar: '#10b981',
      botaoPesquisarAtivo: '#34d399',
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
    console.log(
      'Atualizando tema padrão do sistema para "Confectio Delicioso" com cores padronizadas...'
    );

    // Primeiro, deletar configuração existente se houver
    const { error: deleteError } = await supabase
      .from('system_settings')
      .delete()
      .eq('key', 'theme');

    if (deleteError) {
      console.error('Erro ao deletar configuração existente:', deleteError);
      // Continuar mesmo com erro de delete, tentar insert
    }

    // Inserir o novo tema padrão
    const { data, error } = await supabase
      .from('system_settings')
      .insert({
        key: 'theme',
        value: defaultTheme,
        updated_at: new Date().toISOString(),
      })
      .select();

    if (error) {
      console.error('Erro ao inserir tema padrão:', error);
      return;
    }

    console.log('✅ Tema padrão atualizado com sucesso!');
    console.log(
      'Tema "Confectio Delicioso" definido como padrão do sistema com cores padronizadas.'
    );
    console.log('Principais mudanças:');
    console.log('- Botão Cancelar: #dc2626 (Tailwind vermelho padrão)');
    console.log('- Botão Pesquisar: #059669 (verde padrão) no modo claro');
    console.log('- Despesas em gráficos: cores Tailwind padronizadas');
    console.log('Dados atualizados:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Erro geral ao atualizar tema:', error);
  }
}

updateDefaultTheme();
