'use client';

import { useState, useEffect, useRef } from 'react';
import type { ThemeSettings } from '@/lib/types';
// Função utilitária para cor primária com opacidade
function getPrimaryWithOpacity(_theme: Partial<ThemeSettings> | undefined, opacity: number) {
  let color = '#88544c';
  if (typeof window !== 'undefined') {
    const cssPrimary = getComputedStyle(document.documentElement)
      .getPropertyValue('--primary')
      .trim();
    if (cssPrimary) color = cssPrimary;
  }
  if (typeof color === 'string' && color.startsWith('#') && color.length === 7) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${opacity})`;
  } else if (typeof color === 'string' && color.startsWith('rgb')) {
    return color.replace('rgb', 'rgba').replace(')', `,${opacity})`);
  }
  return color;
}
import { useTheme } from '@/lib/theme';
import getImageUrl from '@/lib/getImageUrl';
import { useAuth } from '@/lib/auth';
import { getOperationalContext } from '@/lib/operationalLocal';
import { usePageTracking } from '@/hooks/usePageTracking';
import { supabase } from '@/lib/supabase';
import safeSelect from '@/lib/supabaseSafeSelect';
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
import { useRouter } from 'next/navigation';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

export default function DashboardHeader({ onMenuClick }: { onMenuClick?: () => void }) {
  const _router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAISearch, setShowAISearch] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const { theme, resolvedTheme, updateTheme } = useTheme();
  const _rawLogo = String(theme?.logo_url ?? '').toString().trim();
  const logoUrl = getImageUrl(_rawLogo) || _rawLogo;
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
    window.location.href = '/';
  };

  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [opLocalId, setOpLocalId] = useState<string | null>(null);

  // Ref para a busca (sugestões IA)
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

  // useEffect para detectar cliques fora do campo de busca (sugestões IA)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      const isOutsideSearch = !searchRef.current || !searchRef.current.contains(target);
      if (isOutsideSearch) setShowAISearch(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
  const roleVal = profile?.role ?? '';
  const allowedRoles = ['admin', 'fabrica', 'master'];
  const filteredActions = quickActions.filter((action) => {
    if (allowedRoles.includes(roleVal)) return true;
    if (roleVal === 'fabrica') return action.label !== 'Novo PDV';
    return false;
  });

  const isAdmin = roleVal === 'admin' || roleVal === 'master';
  const isPdv = roleVal === 'pdv';
  const isFabrica = roleVal === 'fabrica';
  const isCompras = roleVal === 'compras';

  // --- Notifications: fetch recent vendas and caixa events and subscribe realtime ---
  const mapVendaToNotif = (v: any) => ({
    id: `v-${v.id}`,
    title: 'Venda realizada',
    message: `${v.local?.nome || 'PDV'} realizou venda de R$ ${Number(v.total_venda || 0).toFixed(2)}`,
    time: v.created_at || new Date().toISOString(),
    type: 'venda',
  });

  const mapCaixaToNotif = (c: any) => {
    if (c.data_fechamento) {
      return {
        id: `c-close-${c.id}`,
        title: 'Caixa fechado',
        message: `${c.local?.nome || 'PDV'} fechou o caixa. Vendas: R$ ${Number(c.total_vendas_sistema || 0).toFixed(2)}`,
        time: c.data_fechamento,
        type: 'caixa_fechado',
      };
    }
    return {
      id: `c-open-${c.id}`,
      title: 'Caixa aberto',
      message: `${c.local?.nome || 'PDV'} abriu o caixa. Saldo inicial: R$ ${Number(c.saldo_inicial || 0).toFixed(2)}`,
      time: c.data_abertura,
      type: 'caixa_aberto',
    };
  };

  const fetchRecentNotifications = async () => {
    try {
      const since = new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(); // últimas 6h
      // admin/master: vê tudo
      if (isAdmin) {
        const { data: vendas, error: errV } = await safeSelect(supabase, 'vendas', 'id,total_venda,created_at,local:locais(nome)', (b: any) =>
          b.gte('created_at', since).order('created_at', { ascending: false }).limit(10)
        );

        const { data: caixasAbertas, error: errCaixaA } = await supabase
          .from('caixa_sessao')
          .select(
            'id,data_abertura,data_fechamento,saldo_inicial,total_vendas_sistema,local:locais(nome)'
          )
          .gte('data_abertura', since)
          .order('data_abertura', { ascending: false })
          .limit(10);

        const { data: caixasFechadas, error: errCaixaF } = await supabase
          .from('caixa_sessao')
          .select(
            'id,data_abertura,data_fechamento,saldo_inicial,total_vendas_sistema,local:locais(nome)'
          )
          .gte('data_fechamento', since)
          .order('data_fechamento', { ascending: false })
          .limit(10);

        const vendasNotifs = (vendas || []).map(mapVendaToNotif);
        const caixaNotifs = [...(caixasAbertas || []), ...(caixasFechadas || [])].map(
          mapCaixaToNotif
        );

        const merged = [...vendasNotifs, ...caixaNotifs].sort(
          (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
        );
        setNotificationsList(merged.slice(0, 20));
        return;
      }

      // PDV: ver apenas eventos do próprio local
      if (isPdv) {
        const localId = opLocalId ?? (profile as any)?.local_id ?? null;
        if (!localId) {
          setNotificationsList([]);
          return;
        }
        const { data: vendas, error: errV } = await supabase
          .from('vendas')
          .select('id,total_venda,created_at,local:locais(nome),local_id')
          .eq('local_id', localId)
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(10);

        const { data: caixasAbertas } = await supabase
          .from('caixa_sessao')
          .select('id,data_abertura,data_fechamento,saldo_inicial,total_vendas_sistema,local:locais(nome),local_id')
          .eq('local_id', localId)
          .gte('data_abertura', since)
          .order('data_abertura', { ascending: false })
          .limit(10);

        const { data: caixasFechadas } = await supabase
          .from('caixa_sessao')
          .select('id,data_abertura,data_fechamento,saldo_inicial,total_vendas_sistema,local:locais(nome),local_id')
          .eq('local_id', localId)
          .gte('data_fechamento', since)
          .order('data_fechamento', { ascending: false })
          .limit(10);

        const vendasNotifs = (vendas || []).map(mapVendaToNotif);
        const caixaNotifs = [...(caixasAbertas || []), ...(caixasFechadas || [])].map(
          mapCaixaToNotif
        );

        setNotificationsList([...vendasNotifs, ...caixaNotifs].slice(0, 20));
        return;
      }

      // Fabrica / Compras: mostrar notificacoes de pedidos de compra
      if (isFabrica || isCompras) {
        const { data: nots } = await supabase
          .from('notificacoes_pedido')
          .select('id,pedido_id,tipo,mensagem,created_at')
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(20);

        const mapPedido = (p: any) => ({
          id: `np-${p.id}`,
          title: `Pedido #${p.pedido_id}`,
          message: p.mensagem || 'Notificação de pedido',
          time: p.created_at || new Date().toISOString(),
          type: 'pedido',
        });

        setNotificationsList((nots || []).map(mapPedido));
        return;
      }

      // Default: manter lista vazia
      setNotificationsList([]);
    } catch (e) {
      // ignore
      console.error('Erro fetch notifications', e);
    }
  };

  useEffect(() => {
    if (showNotifications) void fetchRecentNotifications();
  }, [showNotifications, opLocalId]);

  useEffect(() => {
    // Subscribes to realtime events for vendas, caixa_sessao and notificacoes_pedido (condicional)
    // Re-run when profile/role changes so subscriptions respect visibility rules
    let vendasChannel: any = null;
    let caixaChannel: any = null;
    let pedidoChannel: any = null;
    let mounted = true;

    (async () => {
      try {
        const ctx = await getOperationalContext(profile);
        const myLocal = ctx.caixa?.local_id ?? ctx.localId ?? (profile as any)?.local_id ?? null;
        if (!mounted) return;
        setOpLocalId(myLocal ?? null);

        vendasChannel = supabase
          .channel('public:vendas')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vendas' }, (payload) => {
            const v = payload.new as any;
            if (isAdmin) {
              const notif = mapVendaToNotif(v);
              setNotificationsList((prev) => [notif, ...prev].slice(0, 50));
            } else if (isPdv) {
              if (myLocal && v.local_id === myLocal) {
                const notif = mapVendaToNotif(v);
                setNotificationsList((prev) => [notif, ...prev].slice(0, 50));
              }
            }
          })
          .subscribe();

        caixaChannel = supabase
          .channel('public:caixa_sessao')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'caixa_sessao' }, async (payload) => {
            const c = payload.new as any;
            if (!isAdmin && !isPdv) return;

            let localName = c.local?.nome;
            if (!localName && c.local_id) {
              try {
                const { data: l } = await supabase.from('locais').select('nome').eq('id', c.local_id).maybeSingle();
                localName = l?.nome;
              } catch (e) {
                // ignore
              }
            }

            let userName: string | undefined = undefined;
            if (c.usuario_abertura) {
              try {
                const { data: p } = await supabase.from('profiles').select('nome').eq('id', c.usuario_abertura).maybeSingle();
                userName = p?.nome;
              } catch (e) {
                // ignore
              }
            }

            const title = c.data_fechamento ? 'Caixa fechado' : 'Caixa aberto';
            const message = c.data_fechamento
              ? `${userName || localName || 'PDV'} fechou o caixa. Vendas: R$ ${Number(c.total_vendas_sistema || 0).toFixed(2)}`
              : `${userName || localName || 'PDV'} abriu o caixa. Saldo inicial: R$ ${Number(c.saldo_inicial || 0).toFixed(2)}`;

            if (isPdv) {
              if (myLocal && c.local_id !== myLocal) return;
            }

            const notif = {
              id: c.data_fechamento ? `c-close-${c.id}` : `c-open-${c.id}`,
              title,
              message,
              time: c.data_abertura || c.data_fechamento || new Date().toISOString(),
              type: c.data_fechamento ? 'caixa_fechado' : 'caixa_aberto',
            };

            setNotificationsList((prev) => [notif, ...prev].slice(0, 50));
          })
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'caixa_sessao' }, async (payload) => {
            const c = payload.new as any;
            if (!c.data_fechamento) return;
            if (!isAdmin && !isPdv) return;

            let userName: string | undefined = undefined;
            let localName = c.local?.nome;
            if (!localName && c.local_id) {
              try {
                const { data: l } = await supabase.from('locais').select('nome').eq('id', c.local_id).maybeSingle();
                localName = l?.nome;
              } catch (e) {}
            }
            if (c.usuario_fechamento) {
              try {
                const { data: p } = await supabase.from('profiles').select('nome').eq('id', c.usuario_fechamento).maybeSingle();
                userName = p?.nome;
              } catch (e) {}
            }

            if (isPdv) {
              if (myLocal && c.local_id !== myLocal) return;
            }

            const notif = {
              id: `c-close-${c.id}`,
              title: 'Caixa fechado',
              message: `${userName || localName || 'PDV'} fechou o caixa. Vendas: R$ ${Number(c.total_vendas_sistema || 0).toFixed(2)}`,
              time: c.data_fechamento,
              type: 'caixa_fechado',
            };
            setNotificationsList((prev) => [notif, ...prev].slice(0, 50));
          })
          .subscribe();

        if (isFabrica || isCompras) {
          pedidoChannel = supabase
            .channel('public:notificacoes_pedido')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificacoes_pedido' }, (payload) => {
              const p = payload.new as any;
              const notif = {
                id: `np-${p.id}`,
                title: `Pedido #${p.pedido_id}`,
                message: p.mensagem || 'Notificação de pedido',
                time: p.created_at || new Date().toISOString(),
                type: 'pedido',
              };
              setNotificationsList((prev) => [notif, ...prev].slice(0, 50));
            })
            .subscribe();
        }
      } catch (e) {
        console.error('Erro ao iniciar subscriptions de notificações:', e);
      }
    })();

    return () => {
      mounted = false;
      try {
        if (vendasChannel) supabase.removeChannel(vendasChannel);
        if (caixaChannel) supabase.removeChannel(caixaChannel);
        if (pedidoChannel) supabase.removeChannel(pedidoChannel);
      } catch (e) {
        // ignore
      }
    };
  }, [profile?.id, roleVal]);

  return (
    <header
      className="flex h-16 items-center justify-between border-b px-6 overflow-visible"
      style={{ background: 'var(--header-bg, var(--secondary))', borderColor: 'var(--primary)' }}
    >
      {/* Menu Mobile */}
      <button
        className="rounded-md p-2 lg:hidden"
        style={{ transition: 'background 0.2s' }}
        onClick={() => onMenuClick?.()}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = getPrimaryWithOpacity(theme, 0.8);
          (e.currentTarget as HTMLElement).style.color = '';
          const icon = e.currentTarget.querySelector('svg');
          if (icon) icon.style.color = getPrimaryWithOpacity(theme, 0.8);
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = '';
          (e.currentTarget as HTMLElement).style.color = '';
          const icon = e.currentTarget.querySelector('svg');
          if (icon) icon.style.color = '';
        }}
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Logo e Busca */}
      <div className="flex flex-1 items-center gap-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          {/* Logo do Sistema (Marca A - sempre visível se existir) */}
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={theme.name || 'Sistema'}
              width={32}
              height={32}
              className="rounded-md object-contain"
              style={{
                width: `calc(32px * var(--logo-scale, ${theme?.logo_scale ?? 1}))`,
                height: 'auto',
                imageRendering: 'auto',
              }}
              loading="eager"
            />
          ) : (
            <span className="hidden text-lg font-semibold sm:inline">
              {theme.name || 'SistemaLari'}
            </span>
          )}
        </Link>

        <div ref={searchRef} className="relative hidden w-full max-w-md sm:block">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="search"
            placeholder="Pesquisar com IA..."
            className="block w-full rounded-md border bg-white py-2 pl-10 pr-12 leading-5 placeholder-gray-500 focus:border-[var(--primary)] focus:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[var(--primary)] dark:border-gray-600 dark:bg-gray-800 sm:text-sm"
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
            className="absolute inset-y-0 right-0 flex items-center pr-3"
          >
            <Sparkles
              className={`h-5 w-5 ${showAISearch ? 'text-purple-500' : 'text-gray-400 hover:text-purple-500'} transition-colors`}
            />
          </button>

          {/* Sugestões de IA */}
          {showAISearch && (searchSuggestions.length > 0 || searchHistory.length > 0) && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
              {/* Sugestões inteligentes */}
              {searchSuggestions.length > 0 && (
                <div className="p-2">
                  <div className="flex items-center gap-2 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <Lightbulb className="h-3 w-3" />
                    Sugestões IA
                  </div>
                  {searchSuggestions.map((suggestion, index) => (
                    <button
                      key={`suggestion-${index}`}
                      onClick={() => handleSearchSubmit(suggestion)}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              {/* Histórico de pesquisa */}
              {searchHistory.length > 0 && (
                <div className="border-t border-gray-200 p-2 dark:border-gray-700">
                  <div className="flex items-center gap-2 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
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
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
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
        {allowedRoles.includes(profile?.role ?? '') && (
          <Popover open={showQuickMenu} onOpenChange={setShowQuickMenu}>
            <div className="relative">
              <PopoverTrigger asChild>
                <button
                  className="flex items-center gap-2 rounded-md p-2"
                  style={{ transition: 'background 0.2s' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = getPrimaryWithOpacity(
                      theme,
                      0.8
                    );
                    const icons = e.currentTarget.querySelectorAll('svg');
                    icons.forEach((icon) => {
                      icon.style.color = getPrimaryWithOpacity(theme, 0.8);
                    });
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = '';
                    const icons = e.currentTarget.querySelectorAll('svg');
                    icons.forEach((icon) => {
                      icon.style.color = '';
                    });
                  }}
                >
                  <Plus className="h-5 w-5" />
                  <span className="hidden sm:inline">Atalhos</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
              </PopoverTrigger>

              <PopoverContent className="w-80 p-0" align="end">
                <div className="max-h-96 overflow-y-auto rounded-md" style={{ background: 'var(--secondary)', border: '1px solid var(--primary)' }}>
                  <div className="border-b border-gray-200 p-3 dark:border-gray-700">
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Ações Rápidas
                    </h4>
                    <div className="space-y-1">
                      {filteredActions.map((action, index) => (
                        <Link
                          key={`action-${index}`}
                          href={action.href}
                          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700"
                          style={{ transition: 'background 0.2s' }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background = getPrimaryWithOpacity(
                              theme,
                              0.8
                            );
                            const icon = e.currentTarget.querySelector('svg');
                            if (icon) icon.style.color = getPrimaryWithOpacity(theme, 0.8);
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background = '';
                            const icon = e.currentTarget.querySelector('svg');
                            if (icon) icon.style.color = '';
                          }}
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

                  {pinnedPages.length > 0 && (
                    <div className="border-b border-gray-200 p-3 dark:border-gray-700">
                      <h4 className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
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
                                className="flex flex-1 items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700"
                                style={{ transition: 'background 0.2s' }}
                                onMouseEnter={(e) => {
                                  (e.currentTarget as HTMLElement).style.background = getPrimaryWithOpacity(theme, 0.8);
                                  const icon = e.currentTarget.querySelector('svg');
                                  if (icon) icon.style.color = getPrimaryWithOpacity(theme, 0.8);
                                }}
                                onMouseLeave={(e) => {
                                  (e.currentTarget as HTMLElement).style.background = '';
                                  const icon = e.currentTarget.querySelector('svg');
                                  if (icon) icon.style.color = '';
                                }}
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

                  {recentPages.length > 0 && (
                    <div className="p-3">
                      <h4 className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        <Clock className="h-3 w-3" />
                        Recentes
                      </h4>
                      <div className="space-y-1">
                        {recentPages.map((page) => (
                          <div key={`recent-${page.href}`} className="flex items-center justify-between">
                            <Link
                              href={page.href}
                              className="flex flex-1 items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700"
                              style={{ transition: 'background 0.2s' }}
                              onMouseEnter={(e) => {
                                (e.currentTarget as HTMLElement).style.background = getPrimaryWithOpacity(theme, 0.8);
                                const icon = e.currentTarget.querySelector('svg');
                                if (icon) icon.style.color = getPrimaryWithOpacity(theme, 0.8);
                              }}
                              onMouseLeave={(e) => {
                                (e.currentTarget as HTMLElement).style.background = '';
                                const icon = e.currentTarget.querySelector('svg');
                                if (icon) icon.style.color = '';
                              }}
                              onClick={() => setShowQuickMenu(false)}
                            >
                              <Star className="h-4 w-4" />
                              {page.label}
                            </Link>
                            <button
                              onClick={() => togglePinPage(page.href)}
                              className={`p-1 ${pinnedPages.includes(page.href) ? 'text-yellow-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                              title={pinnedPages.includes(page.href) ? 'Desfixar página' : 'Fixar página'}
                            >
                              <Pin className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </div>
          </Popover>
        )}

        {/* Atualizar */}
        <button
          onClick={() => window.location.reload()}
          className="rounded-md p-2"
          style={{ transition: 'background 0.2s' }}
          title="Atualizar dados"
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = getPrimaryWithOpacity(theme, 0.8);
            (e.currentTarget as HTMLElement).style.color = '';
            const icon = e.currentTarget.querySelector('svg');
            if (icon) icon.style.color = getPrimaryWithOpacity(theme, 0.8);
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = '';
            (e.currentTarget as HTMLElement).style.color = '';
            const icon = e.currentTarget.querySelector('svg');
            if (icon) icon.style.color = '';
          }}
        >
          <RefreshCw className="h-5 w-5" />
        </button>

        {/* Notificações */}
        <Popover open={showNotifications} onOpenChange={setShowNotifications}>
          <div className="relative">
            <PopoverTrigger asChild>
              <button
                className="relative rounded-md p-2"
                style={{ transition: 'background 0.2s' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = getPrimaryWithOpacity(theme, 0.8);
                  const icon = e.currentTarget.querySelector('svg');
                  if (icon) icon.style.color = getPrimaryWithOpacity(theme, 0.8);
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = '';
                  const icon = e.currentTarget.querySelector('svg');
                  if (icon) icon.style.color = '';
                }}
                onClick={() => {
                  setShowQuickMenu(false);
                  setShowUserMenu(false);
                }}
              >
                <Bell className="h-5 w-5" />
                <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                  2
                </span>
              </button>
            </PopoverTrigger>

            <PopoverContent className="w-80 p-0" align="end">
              <div className="rounded-md" style={{ background: 'var(--secondary)', border: '1px solid var(--primary)' }}>
                <div className="border-b border-gray-200 p-4 dark:border-gray-700">
                  <h3 className="text-sm font-medium">Notificações</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notificationsList.length === 0 && (
                    <div className="border-b border-gray-200 p-4 dark:border-gray-700">
                      <p className="text-sm text-gray-600 dark:text-gray-300">Sem novas notificações</p>
                    </div>
                  )}

                  {notificationsList.map((n) => (
                    <div key={n.id} className="border-b border-gray-200 p-4 dark:border-gray-700">
                      <p className="text-sm text-gray-700 dark:text-gray-200">{n.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{n.message}</p>
                      <p className="mt-1 text-xs text-gray-400">{new Date(n.time).toLocaleString('pt-BR')}</p>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </div>
        </Popover>

        {/* Toggle tema */}
        <button
          onClick={toggleMode}
          className="rounded-md p-2"
          style={{ transition: 'background 0.2s' }}
          title={effectiveMode === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = getPrimaryWithOpacity(theme, 0.8);
            (e.currentTarget as HTMLElement).style.color = '';
            const icon = e.currentTarget.querySelector('svg');
            if (icon) icon.style.color = getPrimaryWithOpacity(theme, 0.8);
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = '';
            (e.currentTarget as HTMLElement).style.color = '';
            const icon = e.currentTarget.querySelector('svg');
            if (icon) icon.style.color = '';
          }}
        >
          {effectiveMode === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Menu do usuário */}
        <Popover open={showUserMenu} onOpenChange={setShowUserMenu}>
          <div className="relative">
            <PopoverTrigger asChild>
              <button
                className="flex items-center gap-2 rounded-md p-2"
                style={{ transition: 'background 0.2s' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = getPrimaryWithOpacity(theme, 0.8);
                  (e.currentTarget as HTMLElement).style.color = '';
                  const icon = e.currentTarget.querySelector('svg');
                  if (icon) icon.style.color = getPrimaryWithOpacity(theme, 0.8);
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = '';
                  (e.currentTarget as HTMLElement).style.color = '';
                  const icon = e.currentTarget.querySelector('svg');
                  if (icon) icon.style.color = '';
                }}
                onClick={() => {
                  setShowQuickMenu(false);
                  setShowNotifications(false);
                }}
              >
                <User className="h-5 w-5" />
                <span className="hidden text-sm font-medium sm:inline">{profile?.nome || profile?.email || 'Usuário'}</span>
              </button>
            </PopoverTrigger>

            <PopoverContent className="w-48 p-0" align="end">
              <div className="rounded-md" style={{ background: 'var(--secondary)', border: '1px solid var(--primary)' }}>
                <div className="border-b border-gray-200 px-4 py-2 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  {profile?.role === 'admin' && 'Administrador'}
                  {profile?.role === 'fabrica' && 'Fábrica'}
                  {profile?.role === 'pdv' && 'PDV'}
                </div>
                {profile?.role === 'admin' && (
                  <Link
                    href="/dashboard/usuarios"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700"
                    style={{ transition: 'background 0.2s' }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = getPrimaryWithOpacity(theme, 0.8);
                      const icon = e.currentTarget.querySelector('svg');
                      if (icon) icon.style.color = getPrimaryWithOpacity(theme, 0.8);
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = '';
                      const icon = e.currentTarget.querySelector('svg');
                      if (icon) icon.style.color = '';
                    }}
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
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700"
                  style={{ transition: 'background 0.2s' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = getPrimaryWithOpacity(theme, 0.8);
                    const icon = e.currentTarget.querySelector('svg');
                    if (icon) icon.style.color = getPrimaryWithOpacity(theme, 0.8);
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = '';
                    const icon = e.currentTarget.querySelector('svg');
                    if (icon) icon.style.color = '';
                  }}
                >
                  <Settings className="h-4 w-4" />
                  Ajustes
                </button>
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600"
                  style={{ transition: 'background 0.2s' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = getPrimaryWithOpacity(theme, 0.8);
                    const icon = e.currentTarget.querySelector('svg');
                    if (icon) icon.style.color = getPrimaryWithOpacity(theme, 0.8);
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = '';
                    const icon = e.currentTarget.querySelector('svg');
                    if (icon) icon.style.color = '';
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </div>
            </PopoverContent>
          </div>
        </Popover>
      </div>
    </header>
  );
}
