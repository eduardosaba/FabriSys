/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: 'var(--primary)',
        secondary: 'var(--secondary)',
        accent: 'var(--accent)',
        // Novas cores customizáveis
        'titulo-paginas': 'var(--titulo-paginas)',
        'hover-3-submenu': 'var(--hover-3-submenu)',
        'texto-geral-hover': 'var(--texto-geral-hover)',
        'bordas-header-perfil': 'var(--bordas-header-perfil)',
        'bordas-selecao-listagens': 'var(--bordas-selecao-listagens)',
        'barra-dashboard': 'var(--barra-dashboard)',
        'barra-dashboard-hover': 'var(--barra-dashboard-hover)',
        'receitas-graficos': 'var(--receitas-graficos)',
        'receitas-graficos-secundaria': 'var(--receitas-graficos-secundaria)',
        'despesas-graficos': 'var(--despesas-graficos)',
        'despesas-graficos-secundaria': 'var(--despesas-graficos-secundaria)',
        'barra-rolagem': 'var(--barra-rolagem)',
        'barra-rolagem-fundo': 'var(--barra-rolagem-fundo)',
        'fundo-link-ead': 'var(--fundo-link-ead)',
        'texto-link-ead': 'var(--texto-link-ead)',
        'botao-salvar': 'var(--botao-salvar)',
        'botao-salvar-ativo': 'var(--botao-salvar-ativo)',
        'botao-salvar-desabilitado': 'var(--botao-salvar-desabilitado)',
        'botao-cancelar': 'var(--botao-cancelar)',
        'botao-cancelar-ativo': 'var(--botao-cancelar-ativo)',
        'botao-cancelar-desabilitado': 'var(--botao-cancelar-desabilitado)',
        'botao-pesquisar': 'var(--botao-pesquisar)',
        'botao-pesquisar-ativo': 'var(--botao-pesquisar-ativo)',
        'botao-pesquisar-desabilitado': 'var(--botao-pesquisar-desabilitado)',
        'campos-obrigatorios': 'var(--campos-obrigatorios)',
        'campos-nao-obrigatorios': 'var(--campos-nao-obrigatorios)',
        'barra-superior-menu': 'var(--barra-superior-menu)',
        'texto-icone-ajuda': 'var(--texto-icone-ajuda)',
        'icone-ajuda': 'var(--icone-ajuda)',
        //'overlay-mobile': 'var(--overlay-mobile, rgba(0, 0, 0, 0.5))',
        //'sidebar-active-bg': 'var(--sidebar-active-bg, rgb(245 243 255))',
        //'sidebar-active-text': 'var(--sidebar-active-text, rgb(79 70 229))',
        //'sidebar-bg': 'var(--sidebar-bg, #ffffff)',
        //'sidebar-hover-bg': 'var(--sidebar-hover-bg, #f3f4f6)',
        //'header-bg': 'var(--header-bg, #ffffff)',
        //'status-success-bg': 'var(--status-success-bg, rgb(236 253 245))',
        //'status-success-text': 'var(--status-success-text, rgb(34 197 94))',
        //'status-warning-bg': 'var(--status-warning-bg, rgb(254 243 199))',
        //'status-warning-text': 'var(--status-warning-text, rgb(245 158 11))',
        //'status-danger-bg': 'var(--status-danger-bg, rgb(254 226 226))',
        //'status-danger-text': 'var(--status-danger-text, rgb(239 68 68))',
        //'loading-spinner': 'var(--loading-spinner, rgb(37 99 235))',
        //'loading-text': 'var(--loading-text, rgb(75 85 99))',
        //'loading-button-bg': 'var(--loading-button-bg, rgb(37 99 235))',
        //'loading-button-hover': 'var(--loading-button-hover, rgb(29 78 216))',
        //'trend-positive': 'var(--trend-positive, rgb(34 197 94))',
        //'trend-negative': 'var(--trend-negative, rgb(239 68 68))',
        'overlay-mobile': 'rgba(0, 0, 0, 0.7)', // Overlay mais escuro
        'sidebar-active-bg': '#88544c',         // Caramelo (Fundo do item ativo)
        'sidebar-active-text': '#f2e8e3',       // Branco Suave (Texto do item ativo)
        'sidebar-bg': '#e8e8e8',                // Fundo fixo da Sidebar
        'sidebar-hover-bg': '#88544c',          // Hover fixo da Sidebar
        'header-bg': '#e9c4c2',                 // Fundo fixo do Header
    
    // Status e Alertas (Mantido contraste padrão de sucesso/alerta em fundos escuros)
        'status-success-bg': '#044026',         // Verde Escuro para fundo
        'status-success-text': '#34d399',       // Verde Claro para texto
        'status-warning-bg': '#693e08',         // Âmbar Escuro para fundo
        'status-warning-text': '#fbbf24',       // Âmbar Claro para texto
        'status-danger-bg': '#5b1212',          // Vermelho Escuro para fundo
        'status-danger-text': '#f87171',        // Vermelho Claro para texto
    
    // Loading (Carregamento)
        'loading-spinner': '#e9c4c2',           // Rosa Claro/Creme (Cor do spinner)
        'loading-text': '#9ca3af',              // Cinza Médio (Texto de carregamento)
        'loading-button-bg': '#e9c4c2',         // Rosa Claro/Creme (Fundo do botão de carregamento)
        'loading-button-hover': '#f2e8e3',      // Branco Suave (Hover do botão de carregamento)
    
    // Tendências
        'trend-positive': '#34d399',            // Verde Claro
        'trend-negative': '#f87171',            // Vermelho Claro
    
    // Variáveis Padrão Adicionais (Mantidas da lista original Confectio)
        receitasGraficos: '#e9c4c2',
        receitasGraficosSecundaria: '#88544c',
        despesasGraficos: '#ef4444', 
        despesasGraficosSecundaria: '#f87171',
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
      },
      fontFamily: {
        sans: ['var(--custom-font-family, Inter, sans-serif)'],
        mono: ['var(--font-mono)'],
        inter: ['var(--font-inter)'],
        poppins: ['var(--font-poppins)'],
        roboto: ['var(--font-roboto)'],
        'open-sans': ['var(--font-open-sans)'],
        lato: ['var(--font-lato)'],
        montserrat: ['var(--font-montserrat)'],
        nunito: ['var(--font-nunito)'],
        ubuntu: ['var(--font-ubuntu)'],
        'crimson-text': ['var(--font-crimson-text)'],
        'playfair-display': ['var(--font-playfair-display)'],
        lora: ['var(--font-lora)'],
        merriweather: ['var(--font-merriweather)'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};

module.exports = config;
