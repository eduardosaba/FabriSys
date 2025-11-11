-- Atualiza o tema padrão com todas as cores específicas da customização
DO $$
DECLARE
  full_theme jsonb;
BEGIN
  -- Define o tema completo com todas as cores específicas
  full_theme := jsonb_build_object(
    'name', 'Sistema Lari',
    'logo_url', '/logo.png',
    'logo_scale', 1.0,
    'font_family', 'Inter',
    'border_radius', '0.5rem',
    'theme_mode', 'light',
    'density', 'comfortable',
    'colors', jsonb_build_object(
      'light', jsonb_build_object(
        'primary', '#4CAF50',
        'secondary', '#4f46e5',
        'accent', '#f97316',
        'background', '#ffffff',
        'text', '#ffffff',
        'tituloPaginas', '#ffffff',
        'hover3Submenu', '#2E7D32',
        'textoGeralHover', '#388E3C',
        'bordasHeaderPerfil', '#A5D6A7',
        'bordasSelecaoListagens', '#C8E6C9',
        'barraDashboard', '#04A9DA',
        'barraDashboardHover', '#04A9DA',
        'receitasGraficos', '#388E3C',
        'receitasGraficosSecundaria', '#81C784',
        'despesasGraficos', '#D32F2F',
        'despesasGraficosSecundaria', '#E57373',
        'barraRolagem', '#4CAF50',
        'barraRolagemFundo', '#C8E6C9',
        'fundoLinkEAD', '#66BB6A',
        'textoLinkEAD', '#388E3C',
        'botaoSalvar', '#27AE60',
        'botaoSalvarAtivo', '#219A52',
        'botaoSalvarDesabilitado', '#7F8C8D',
        'botaoCancelar', '#E74C3C',
        'botaoCancelarAtivo', '#C0392B',
        'botaoCancelarDesabilitado', '#95A5A6',
        'botaoPesquisar', '#3498DB',
        'botaoPesquisarAtivo', '#2980B9',
        'botaoPesquisarDesabilitado', '#BDC3C7',
        'camposObrigatorios', '#F1C40F',
        'camposNaoObrigatorios', '#ECF0F1',
        'barraSuperiorMenu', '#2ECC71',
        'textoIconeAjuda', '#34495E',
        'iconeAjuda', '#2ECC71',
        'marcaPrimaria', '#4CAF50',
        'marcaSecundaria', '#81C784',
        'marcaDestaque', '#FF9800',
        'marcaFundo', '#F5F5F5'
      ),
      'dark', jsonb_build_object(
        'primary', '#3b82f6',
        'secondary', '#6366f1',
        'accent', '#f97316',
        'background', '#1a1a1a',
        'text', '#f3f4f6',
        'tituloPaginas', '#f3f4f6',
        'hover3Submenu', '#2E7D32',
        'textoGeralHover', '#388E3C',
        'bordasHeaderPerfil', '#A5D6A7',
        'bordasSelecaoListagens', '#C8E6C9',
        'barraDashboard', '#04A9DA',
        'barraDashboardHover', '#04A9DA',
        'receitasGraficos', '#388E3C',
        'receitasGraficosSecundaria', '#81C784',
        'despesasGraficos', '#D32F2F',
        'despesasGraficosSecundaria', '#E57373',
        'barraRolagem', '#4CAF50',
        'barraRolagemFundo', '#C8E6C9',
        'fundoLinkEAD', '#66BB6A',
        'textoLinkEAD', '#388E3C',
        'botaoSalvar', '#27AE60',
        'botaoSalvarAtivo', '#219A52',
        'botaoSalvarDesabilitado', '#7F8C8D',
        'botaoCancelar', '#E74C3C',
        'botaoCancelarAtivo', '#C0392B',
        'botaoCancelarDesabilitado', '#95A5A6',
        'botaoPesquisar', '#3498DB',
        'botaoPesquisarAtivo', '#2980B9',
        'botaoPesquisarDesabilitado', '#BDC3C7',
        'camposObrigatorios', '#F1C40F',
        'camposNaoObrigatorios', '#ECF0F1',
        'barraSuperiorMenu', '#2ECC71',
        'textoIconeAjuda', '#34495E',
        'iconeAjuda', '#2ECC71',
        'marcaPrimaria', '#4CAF50',
        'marcaSecundaria', '#81C784',
        'marcaDestaque', '#FF9800',
        'marcaFundo', '#F5F5F5'
      )
    )
  );

  -- Atualiza ou insere o tema padrão
  INSERT INTO system_settings (key, value, updated_at)
  VALUES ('theme', full_theme, NOW())
  ON CONFLICT (key) DO UPDATE SET
    value = full_theme,
    updated_at = NOW();

  RAISE NOTICE 'Tema padrão atualizado com todas as cores específicas da customização';
END $$;