'use client';

import { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { usePageTracking } from '@/hooks/usePageTracking';
import {
  Search,
  Sun,
  Moon,
  User,
  Settings,
  LogOut,
  Bell,
  Menu,
  Plus,
  Package,
  ShoppingCart,
  Store,
  RefreshCw,
  ChevronDown,
  Pin,
  PinOff,
  Clock,
  Star,
  Sparkles,
  History,
  TrendingUp,
  Lightbulb,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function DashboardHeader() {
  const _router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAISearch, setShowAISearch] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const { theme, resolvedTheme, updateTheme } = useTheme();
  const { profile, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const effectiveMode = theme.theme_mode === 'system' ? resolvedTheme : theme.theme_mode;
  const toggleMode = () => {
    const nextMode = effectiveMode === 'dark' ? 'light' : 'dark';
    void updateTheme({ theme_mode: nextMode });
  };

  const handleSignOut = async () => {
    setShowUserMenu(false);
    await signOut();
    window.location.href = '/login';
  };

  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Refs para os menus
  const quickMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Função para fechar todos os menus
  const closeAllMenus = () => {
    setShowQuickMenu(false);
    setShowNotifications(false);
    setShowUserMenu(false);
    setShowAISearch(false);
  };

  // Funções para pesquisa com IA
  const generateAISuggestions = (query: string) => {
    const suggestions = [];

    if (query.toLowerCase().includes('estoque') || query.toLowerCase().includes('produto')) {
      suggestions.push('Ver produtos com estoque baixo');
      suggestions.push('Produtos mais vendidos');
      suggestions.push('Relatório de inventário');
    }

    if (query.toLowerCase().includes('venda') || query.toLowerCase().includes('pedido')) {
      suggestions.push('Pedidos pendentes');
      suggestions.push('Relatório de vendas mensal');
      suggestions.push('Clientes mais ativos');
    }

    if (query.toLowerCase().includes('producao') || query.toLowerCase().includes('ordem')) {
      suggestions.push('Ordens de produção ativas');
      suggestions.push('Eficiência da produção');
      suggestions.push('Materiais necessários');
    }

    if (query.toLowerCase().includes('fornecedor')) {
      suggestions.push('Fornecedores ativos');
      suggestions.push('Pedidos de compra pendentes');
      suggestions.push('Avaliação de fornecedores');
    }

    // Sugestões gerais se não houver match específico
    if (suggestions.length === 0 && query.length > 2) {
      suggestions.push('Dashboard Principal');
      suggestions.push('Cadastrar novo produto');
      suggestions.push('Ver relatórios');
      suggestions.push('Gerenciar usuários');
    }

    return suggestions;
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);

    if (value.length > 1) {
      const suggestions = generateAISuggestions(value);
      setSearchSuggestions(suggestions);
      setShowAISearch(true);
    } else {
      setSearchSuggestions([]);
      setShowAISearch(false);
    }
  };

  const handleSearchSubmit = (query: string) => {
    if (query.trim()) {
      // Adicionar ao histórico
      setSearchHistory((prev) => {
        const newHistory = [query, ...prev.filter((item) => item !== query)].slice(0, 5);
        return newHistory;
      });

      // Aqui você pode implementar a lógica de busca real
      console.log('Buscando:', query);

      // Fechar sugestões
      setShowAISearch(false);
    }
  };

  // useEffect para detectar cliques fora dos menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;

      // Verifica se o clique foi fora de todos os menus
      const isOutsideQuickMenu = !quickMenuRef.current || !quickMenuRef.current.contains(target);
      const isOutsideNotifications =
        !notificationsRef.current || !notificationsRef.current.contains(target);
      const isOutsideUserMenu = !userMenuRef.current || !userMenuRef.current.contains(target);
      const isOutsideSearch = !searchRef.current || !searchRef.current.contains(target);

      // Se o clique foi fora de todos os menus, fecha todos
      if (isOutsideQuickMenu && isOutsideNotifications && isOutsideUserMenu && isOutsideSearch) {
        closeAllMenus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Hook para gerenciar páginas fixadas e recentes
  const { pinnedPages, recentPages, togglePinPage, trackPageAccess } = usePageTracking();

  // Todas as páginas disponíveis no sistema
  const allPages = [
    { href: '/dashboard', label: 'Dashboard Principal', icon: Star },
    { href: '/dashboard/producao', label: 'Dashboard Produção', icon: Package },
    { href: '/dashboard/insumos', label: 'Dashboard Insumos', icon: ShoppingCart },
    { href: '/dashboard/insumos/cadastro', label: 'Cadastrar Produto', icon: Plus },
    { href: '/dashboard/fornecedores', label: 'Fornecedores', icon: Store },
    { href: '/dashboard/categorias/novo', label: 'Nova Categoria', icon: Plus },
    { href: '/dashboard/producao/nova-ordem', label: 'Nova Ordem', icon: ShoppingCart },
  ];

  const quickActions = [
    { icon: Package, label: 'Novo Insumo', href: '/dashboard/insumos/cadastro' },
    { icon: Plus, label: 'Nova Categoria', href: '/dashboard/categorias/novo' },
    { icon: ShoppingCart, label: 'Nova Ordem', href: '/dashboard/producao/nova-ordem' },
    { icon: Store, label: 'Novo PDV', href: '/dashboard/pdv/novo' },
  ];

  // Filtrar ações baseado no role do usuário
  const filteredActions = quickActions.filter((action) => {
    if (profile?.role === 'admin') return true;
    if (profile?.role === 'fabrica') return action.label !== 'Novo PDV';
    return false;
  });

  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-6">
      {/* Menu Mobile */}
      <button className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md">
        <Menu className="h-6 w-6" />
      </button>

      {/* Logo e Busca */}
      <div className="flex-1 flex items-center gap-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Confectio"
            width={32}
            height={32}
            sizes="32px"
            className="rounded-md object-contain"
            loading="eager"
          />
          <span className="text-lg font-semibold hidden sm:inline">Confectio</span>
        </Link>

        <div ref={searchRef} className="relative max-w-md w-full hidden sm:block">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="search"
            placeholder="Pesquisar com IA..."
            className="block w-full pl-10 pr-12 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-800 dark:border-gray-600 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearchSubmit(searchQuery);
              }
            }}
          />
          <button
            onClick={() => setShowAISearch(!showAISearch)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <Sparkles
              className={`h-5 w-5 ${showAISearch ? 'text-purple-500' : 'text-gray-400 hover:text-purple-500'} transition-colors`}
            />
          </button>

          {/* Sugestões de IA */}
          {showAISearch && (searchSuggestions.length > 0 || searchHistory.length > 0) && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-80 overflow-y-auto">
              {/* Sugestões inteligentes */}
              {searchSuggestions.length > 0 && (
                <div className="p-2">
                  <div className="flex items-center gap-2 px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <Lightbulb className="h-3 w-3" />
                    Sugestões IA
                  </div>
                  {searchSuggestions.map((suggestion, index) => (
                    <button
                      key={`suggestion-${index}`}
                      onClick={() => handleSearchSubmit(suggestion)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center gap-2"
                    >
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              {/* Histórico de pesquisa */}
              {searchHistory.length > 0 && (
                <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <History className="h-3 w-3" />
                    Pesquisas Recentes
                  </div>
                  {searchHistory.map((item, index) => (
                    <button
                      key={`history-${index}`}
                      onClick={() => {
                        setSearchQuery(item);
                        handleSearchSubmit(item);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center gap-2"
                    >
                      <History className="h-4 w-4 text-gray-400" />
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Ações e Ferramentas */}
      <div className="flex items-center gap-4">
        {/* Atalhos Rápidos */}
        {(profile?.role === 'admin' || profile?.role === 'fabrica') && (
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(false);
                setShowUserMenu(false);
                setShowQuickMenu(!showQuickMenu);
              }}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              <span className="hidden sm:inline">Atalhos</span>
              <ChevronDown className="h-4 w-4" />
            </button>

            {showQuickMenu && (
              <div
                ref={quickMenuRef}
                className="absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 max-h-96 overflow-y-auto z-50 transition-all duration-200 ease-out"
              >
                {/* Ações Rápidas */}
                <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Ações Rápidas
                  </h4>
                  <div className="space-y-1">
                    {filteredActions.map((action, index) => (
                      <Link
                        key={`action-${index}`}
                        href={action.href}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                        onClick={() => {
                          setShowQuickMenu(false);
                          trackPageAccess(action.href, action.label, action.icon.name);
                        }}
                      >
                        <action.icon className="h-4 w-4" />
                        {action.label}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Páginas Fixadas */}
                {pinnedPages.length > 0 && (
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Pin className="h-3 w-3" />
                      Fixadas
                    </h4>
                    <div className="space-y-1">
                      {pinnedPages.map((href) => {
                        const page = allPages.find((p) => p.href === href);
                        if (!page) return null;
                        return (
                          <div key={`pinned-${href}`} className="flex items-center justify-between">
                            <Link
                              href={href}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex-1"
                              onClick={() => {
                                setShowQuickMenu(false);
                                trackPageAccess(href, page.label, page.icon.name);
                              }}
                            >
                              <page.icon className="h-4 w-4" />
                              {page.label}
                            </Link>
                            <button
                              onClick={() => togglePinPage(href)}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              title="Desfixar página"
                            >
                              <PinOff className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Páginas Mais Acessadas */}
                {recentPages.length > 0 && (
                  <div className="p-3">
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Recentes
                    </h4>
                    <div className="space-y-1">
                      {recentPages.map((page) => (
                        <div
                          key={`recent-${page.href}`}
                          className="flex items-center justify-between"
                        >
                          <Link
                            href={page.href}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex-1"
                            onClick={() => setShowQuickMenu(false)}
                          >
                            <Star className="h-4 w-4" />
                            {page.label}
                          </Link>
                          <button
                            onClick={() => togglePinPage(page.href)}
                            className={`p-1 ${pinnedPages.includes(page.href) ? 'text-yellow-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                            title={
                              pinnedPages.includes(page.href) ? 'Desfixar página' : 'Fixar página'
                            }
                          >
                            <Pin className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Todas as Páginas */}
              </div>
            )}
          </div>
        )}

        {/* Atualizar */}
        <button
          onClick={() => window.location.reload()}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
          title="Atualizar dados"
        >
          <RefreshCw className="h-5 w-5" />
        </button>

        {/* Notificações */}
        <div className="relative">
          <button
            onClick={() => {
              setShowQuickMenu(false);
              setShowUserMenu(false);
              setShowNotifications(!showNotifications);
            }}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 relative"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-0 right-0 h-4 w-4 text-xs flex items-center justify-center bg-red-500 text-white rounded-full">
              2
            </span>
          </button>

          {showNotifications && (
            <div
              ref={notificationsRef}
              className="absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50 transition-all duration-200 ease-out"
            >
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium">Notificações</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {/* Exemplo de notificação */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    Estoque baixo: Produto X
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Há 5 minutos</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Toggle tema */}
        <button
          onClick={toggleMode}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
          title={effectiveMode === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
        >
          {effectiveMode === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Menu do usuário */}
        <div className="relative">
          <button
            onClick={() => {
              setShowQuickMenu(false);
              setShowNotifications(false);
              setShowUserMenu(!showUserMenu);
            }}
            className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <User className="h-5 w-5" />
            <span className="text-sm font-medium hidden sm:inline">
              {profile?.nome || profile?.email || 'Usuário'}
            </span>
          </button>

          {/* Menu dropdown */}
          {showUserMenu && (
            <div
              ref={userMenuRef}
              className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50 transition-all duration-200 ease-out"
            >
              <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                {profile?.role === 'admin' && 'Administrador'}
                {profile?.role === 'fabrica' && 'Fábrica'}
                {profile?.role === 'pdv' && 'PDV'}
              </div>
              {profile?.role === 'admin' && (
                <Link
                  href="/dashboard/usuarios"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => setShowUserMenu(false)}
                >
                  <User className="h-4 w-4" />
                  Gerenciar Usuários
                </Link>
              )}
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  // TODO: Implementar navegação para ajustes
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
              >
                <Settings className="h-4 w-4" />
                Ajustes
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
