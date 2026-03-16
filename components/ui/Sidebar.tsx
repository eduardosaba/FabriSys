'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Settings,
  X,
  ChevronRight,
  BarChart2,
  Factory,
  Star,
  Calendar,
  ClipboardList,
  ChefHat,
  HelpCircle,
  Store,
  Truck,
  Shield,
  DollarSign,
} from 'lucide-react';

import { useTheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase-client';
import getImageUrl from '@/lib/getImageUrl';

const DEFAULT_PERMISSOES: Record<string, string[]> = {
  master: ['all'],
  admin: ['all'],
  gerente: [],
  compras: [],
  fabrica: [],
  pdv: ['pdv', 'relatorios'],
};

const usePageTracking = () => {
  const [pinned, setPinned] = useState<string[]>([
    '/dashboard/producao/kanban',
    '/dashboard/pdv/caixa',
  ]);
  return {
    pinnedPages: pinned,
    togglePinPage: (href: string) =>
      setPinned((prev) => (prev.includes(href) ? prev.filter((p) => p !== href) : [...prev, href])),
    isPagePinned: (href: string) => pinned.includes(href),
  };
};

// Sub-item (child) do menu
interface SidebarChild {
  name: string;
  href: string;
  // Se definido, apenas roles listados terão acesso ao sub-item
  allowedRoles?: string[];
  id?: string;
  // opcionalmente um ícone (ex.: usado em atalhos/favoritos)
  icon?: React.ReactNode;
}

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  children?: SidebarChild[];
  adminOnly?: boolean;
  // se definido, apenas roles listados terão acesso (ex.: ['admin','master'])
  allowedRoles?: string[];
  id?: string;
}

const sidebarItems: SidebarItem[] = [
  {
    id: 'dashboard',
    name: 'Visão Geral',
    href: '/dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    id: 'agenda',
    name: 'Agenda',
    href: '/dashboard/agenda',
    icon: <Calendar className="h-5 w-5" />,
  },
  {
    id: 'planejamento',
    name: 'Planejamento',
    href: '/dashboard/producao/planejamento',
    icon: <ClipboardList className="h-5 w-5" />,
  },
  {
    id: 'producao',
    name: 'Fábrica',
    href: '/dashboard/producao',
    icon: <Factory className="h-5 w-5" />,
    allowedRoles: ['fabrica', 'admin', 'master'],
    children: [
      { id: 'fabrica_dashboard', name: 'Dashboard Fábrica', href: '/dashboard/producao/fabrica' },
      {
        id: 'producao_kanban',
        name: 'Chão de Fábrica (Kanban)',
        href: '/dashboard/producao/kanban',
      },
      { id: 'ordens_producao', name: 'Ordens de Produção', href: '/dashboard/producao/ordens' },
      { id: 'produtos', name: 'Produtos Finais', href: '/dashboard/producao/produtos' },
      { id: 'ficha_tecnica', name: 'Fichas Técnicas', href: '/dashboard/producao/fichas-tecnicas' },
      {
        id: 'estoque_fabrica',
        name: 'Estoque Fábrica',
        href: '/dashboard/producao/estoque-fabrica',
      },
    ],
  },
  {
    id: 'pdv',
    name: 'PDV & Lojas',
    href: '/dashboard/pdv',
    icon: <Store className="h-5 w-5" />,
    allowedRoles: ['pdv', 'admin', 'master'],
    children: [
      { id: 'pdv_caixa', name: 'Frente de Caixa', href: '/dashboard/pdv/caixa' },
      {
        id: 'pdv_controle_caixa',
        name: 'Controle de Caixa',
        href: '/dashboard/pdv/controle-caixa',
      },
      { id: 'pdv_recebimento', name: 'Recebimento Carga', href: '/dashboard/pdv/recebimento' },
      { id: 'pdv_inventario', name: 'Inventário de Loja', href: '/dashboard/pdv/inventario' },
    ],
  },
  {
    id: 'logistica',
    name: 'Logística',
    href: '/dashboard/logistica',
    icon: <Truck className="h-5 w-5" />,
    children: [{ name: 'Expedição', href: '/dashboard/logistica/expedicao' }],
  },
  {
    id: 'suprimentos',
    name: 'Suprimentos',
    href: '/dashboard/insumos',
    icon: <Package className="h-5 w-5" />,
    allowedRoles: ['admin', 'fabrica', 'master'],
    children: [
      { name: 'Sugestão de Compras (MRP)', href: '/dashboard/compras/sugestao' },
      { name: 'Pedidos de Compra', href: '/dashboard/insumos/pedidos-compra' },
      { name: 'Estoque', href: '/dashboard/insumos/lotes' },
      { name: 'Monitor de Riscos', href: '/dashboard/insumos/alertas' },
      { name: 'Cadastro de Insumos', href: '/dashboard/insumos/cadastro' },
      { name: 'Categorias', href: '/dashboard/insumos/categorias' },
      { name: 'Fornecedores', href: '/dashboard/fornecedores' },
    ],
  },
  {
    id: 'relatorios',
    name: 'Relatórios',
    href: '/dashboard/relatorios',
    icon: <BarChart2 className="h-5 w-5" />,
    allowedRoles: ['admin', 'master'],
    children: [
      { name: 'Painel Gerencial', href: '/dashboard/relatorios' },
      { name: 'Vendas Consolidadas', href: '/dashboard/relatorios/vendas' },
      { name: 'Histórico de Fechamentos', href: '/dashboard/pdv/historico-caixa' },
      { name: 'Posição de Estoque', href: '/dashboard/relatorios/estoque' },
      { name: 'Validade & Perdas', href: '/dashboard/relatorios/validade' },
    ],
  },
  {
    id: 'financeiro',
    name: 'Financeiro',
    href: '/dashboard/financeiro',
    icon: <DollarSign className="h-5 w-5" />,
    allowedRoles: ['admin', 'master'],
    children: [
      {
        id: 'financeiro_conferencia',
        name: 'Conferência de Caixas',
        href: '/dashboard/financeiro/conferencia',
      },
      {
        id: 'financeiro_historico_caixas',
        name: 'Histórico de Caixas',
        href: '/dashboard/relatorios/fechamentos',
      },
      { id: 'financeiro_dre', name: 'DRE - Financeiro', href: '/dashboard/relatorios/dre' },
      {
        id: 'financeiro_contas_pagar',
        name: 'Contas a Pagar',
        href: '/dashboard/financeiro/contas-pagar',
      },
      {
        id: 'financeiro_categorias',
        name: 'Categorias Financeiras',
        href: '/dashboard/financeiro/categorias',
      },
    ],
  },
  // Link adicional para mobile: garante acesso rápido em telas pequenas
  // (movido) item de categorias financeiras agora faz parte do submenu 'financeiro'
  {
    id: 'configuracoes',
    name: 'Configurações',
    href: '/dashboard/configuracoes',
    icon: <Settings className="h-5 w-5" />,
    allowedRoles: ['admin', 'master'],
    children: [
      {
        name: 'Sistema & Regras',
        id: 'configuracoes_sistema',
        href: '/dashboard/configuracoes/sistema',
      },
      {
        name: 'Permissões',
        id: 'configuracoes_permissoes',
        href: '/dashboard/configuracoes/permissoes',
        allowedRoles: ['admin', 'master'],
      },
      {
        name: 'Aparência & Tema',
        id: 'configuracoes_customizacao',
        href: '/dashboard/configuracoes/customizacao',
      },
      {
        name: 'Cadastro de Lojas',
        id: 'configuracoes_lojas',
        href: '/dashboard/configuracoes/lojas',
      },
      {
        name: 'Promoções & Combos',
        id: 'configuracoes_promocoes',
        href: '/dashboard/configuracoes/promocoes',
      },
      {
        name: 'Equipe & Usuários',
        id: 'configuracoes_usuarios',
        href: '/dashboard/configuracoes/usuarios',
      },
      {
        name: 'Gestão de Metas',
        id: 'configuracoes_metas',
        href: '/dashboard/configuracoes/metas',
      },
      {
        name: 'Gestão de Fidelidade',
        id: 'configuracoes_fidelidade',
        href: '/dashboard/configuracoes/fidelidade',
      },
    ],
  },
  {
    id: 'ajuda',
    name: 'Ajuda',
    href: '/dashboard/ajuda',
    icon: <HelpCircle className="h-5 w-5" />,
  },
  {
    id: 'admin',
    name: 'Admin Master',
    href: '/dashboard/admin',
    icon: <Shield className="h-5 w-5 text-purple-500" />,
    adminOnly: true,
    children: [
      { id: 'admin_novo_cliente', name: 'Novo Cliente', href: '/dashboard/admin/novo-cliente' },
      {
        id: 'configuracoes_usuarios',
        name: 'Equipe & Usuários',
        href: '/dashboard/configuracoes/usuarios',
      },
    ],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
  logoUrl?: string;
}

export default function Sidebar({ isOpen, onClose, logoUrl }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  // Toggle rápido para desativar temporariamente o footer do sidebar
  const SHOW_SIDEBAR_FOOTER = false;
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
  const pathname = usePathname();

  const { pinnedPages, togglePinPage, isPagePinned } = usePageTracking();
  const { theme, loading } = useTheme();
  const { profile } = useAuth();
  const [permissoes, setPermissoes] = useState<Record<string, string[]>>({});
  const [permissoesLoading, setPermissoesLoading] = useState(true);

  useEffect(() => {
    async function carregarPermissoesSidebar() {
      setPermissoesLoading(true);
      try {
        if (profile?.organization_id) {
          const { data: globalData } = await supabase
            .from('configuracoes_sistema')
            .select('valor')
            .eq('chave', 'permissoes_acesso')
            .is('organization_id', null)
            .limit(1)
            .maybeSingle();

          const { data: orgData } = await supabase
            .from('configuracoes_sistema')
            .select('valor')
            .eq('chave', 'permissoes_acesso')
            .eq('organization_id', profile.organization_id)
            .limit(1)
            .maybeSingle();

          let parsedGlobal: Record<string, string[]> = {};
          let parsedOrg: Record<string, string[]> = {};
          try {
            if (globalData && globalData.valor) parsedGlobal = JSON.parse(globalData.valor);
          } catch (e) {
            void e;
          }
          try {
            if (orgData && orgData.valor) parsedOrg = JSON.parse(orgData.valor);
          } catch (e) {
            void e;
          }

          const merged = { ...DEFAULT_PERMISSOES, ...(parsedGlobal || {}), ...(parsedOrg || {}) };
          setPermissoes(merged as Record<string, string[]>);
        } else {
          const { data } = await supabase
            .from('configuracoes_sistema')
            .select('valor')
            .eq('chave', 'permissoes_acesso')
            .is('organization_id', null)
            .limit(1)
            .maybeSingle();
          if (data?.valor) {
            try {
              const parsed = JSON.parse(data.valor) as Record<string, string[]>;
              setPermissoes({ ...DEFAULT_PERMISSOES, ...(parsed || {}) });
            } catch {
              setPermissoes(DEFAULT_PERMISSOES);
            }
          } else {
            setPermissoes(DEFAULT_PERMISSOES);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar permissoes sidebar', err);
        setPermissoes(DEFAULT_PERMISSOES);
      } finally {
        setPermissoesLoading(false);
      }
    }

    void carregarPermissoesSidebar();
  }, [profile?.organization_id]);

  const logoSrc = ((): string | null => {
    // 1. Prioridade Máxima: Logo da Organização do Usuário (Upload em Configurações)
    // Buscamos primeiro no profile que vem do hook useAuth
    const orgLogo = (profile as any)?.organizations?.logo_url || profile?.company_logo_url;

    if (orgLogo) {
      const url = getImageUrl(orgLogo.toString());
      if (url) return url;
    }

    // 2. Segunda Prioridade: URL enviada via Props (se houver)
    if (logoUrl) return getImageUrl(logoUrl) || logoUrl;

    // 3. Terceira Prioridade: Logo vinda do tema (Configurações globais)
    const themeLogo = theme?.company_logo_url || theme?.logo_url;
    if (themeLogo) {
      const url = getImageUrl(themeLogo.toString());
      if (url) return url;
    }

    // 4. Fallback: Logo padrão do sistema
    return '/logo.png';
  })();

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
    if (!isCollapsed) {
      setOpenSubmenu(null);
    }
  };

  const toggleSubmenu = (itemName: string) => {
    setOpenSubmenu(openSubmenu === itemName ? null : itemName);
  };

  const handleNavClick = () => {
    try {
      if (onClose && typeof window !== 'undefined' && window.innerWidth < 1024) {
        onClose();
      }
    } catch (e) {
      // ignore
    }
  };

  const isActive = (href: string) => pathname === href;
  const isSubmenuActive = (item: SidebarItem) =>
    item.children?.some((child) => pathname === child.href);

  const hasAccess = (item: SidebarItem) => {
    // adminOnly: apenas master
    if (item.adminOnly) return profile?.role === 'master';

    // Se item explicitamente restringe roles, respeitar primeiro
    if (item.allowedRoles && item.allowedRoles.length > 0) {
      if (!item.allowedRoles.includes(profile?.role ?? '')) return false;
    }

    // Se não temos perfil carregado, negar por segurança
    if (!profile) return false;

    // Se não houver configuração de permissoes carregada, manter comportamento antigo
    const hasConfig = Object.keys(permissoes).length > 0;
    if (!hasConfig) return true;

    if (profile.role === 'master') return true;

    const role = profile?.role ?? '';
    const rolePerms = permissoes[role] || DEFAULT_PERMISSOES[role] || [];
    if (rolePerms.includes('all')) return true;

    // Determina id do módulo para checagem (prefere item.id, senão deriva do href)
    const moduleId =
      (item as any).id ??
      (() => {
        try {
          const parts = item.href.split('/').filter(Boolean);
          if (parts.length === 0) return item.href;
          // ex: /dashboard/producao -> 'producao' ou '/dashboard' -> 'dashboard'
          return parts[parts.length - 1] === 'dashboard' ? 'dashboard' : parts[parts.length - 1];
        } catch {
          return item.href;
        }
      })();

    return rolePerms.includes(moduleId);
  };

  // helpers para cores semânticas
  const getModuleId = (item: SidebarItem) => {
    if ((item as any).id) return (item as any).id as string;
    try {
      const parts = item.href.split('/').filter(Boolean);
      return parts[parts.length - 1];
    } catch {
      return item.name.toLowerCase();
    }
  };

  const getIconColor = (id: string) => {
    const colors: Record<string, string> = {
      producao: 'text-amber-500',
      fabrica: 'text-amber-500',
      pdv: 'text-emerald-500',
      vendas: 'text-emerald-500',
      logistica: 'text-blue-500',
      suprimentos: 'text-purple-500',
      financeiro: 'text-cyan-500',
      relatorios: 'text-rose-500',
      configuracoes: 'text-slate-500',
    };
    return colors[id] || 'text-slate-400';
  };

  // Memoiza o menu visível para evitar recalculos desnecessários
  const visibleMenu = useMemo(() => {
    return sidebarItems
      .filter((item) => hasAccess(item))
      .map((item) => {
        const children = (item.children || []).filter((child) => {
          if (child.allowedRoles && !child.allowedRoles.includes(profile?.role ?? '')) return false;
          const hasConfig = Object.keys(permissoes).length > 0;
          if (hasConfig && profile?.role !== 'master') {
            const role = profile?.role ?? '';
            const rolePerms = permissoes[role] || DEFAULT_PERMISSOES[role] || [];
            if (!rolePerms.includes('all')) {
              const childModuleId =
                (child as any).id ??
                (() => {
                  try {
                    const parts = child.href.split('/').filter(Boolean);
                    return parts[parts.length - 1];
                  } catch {
                    return child.href;
                  }
                })();
              const parentModuleId = (item as any).id;
              if (
                !(
                  rolePerms.includes(childModuleId) ||
                  (parentModuleId && rolePerms.includes(parentModuleId))
                )
              ) {
                return false;
              }
            }
          }
          return true;
        });

        return { ...item, children } as SidebarItem;
      });
  }, [profile?.role, permissoes]);

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}
      style={{
        backgroundColor: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-active-text)',
      }}
    >
      {/* Header do Sidebar */}
      <div
        className="relative flex h-20 flex-col justify-center px-4 py-4"
        style={{ borderBottom: '1px solid var(--sidebar-active-text)' }}
      >
        <div className="flex items-center justify-between">
          <div className={`flex flex-1 ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
            <div className="flex items-center gap-3">
              {/* Logo da empresa com fallback para iniciais */}
              {!isCollapsed ? (
                logoSrc && !logoError ? (
                  <img
                    src={logoSrc}
                    alt="Logo"
                    className="h-8 w-auto object-contain"
                    style={{
                      maxHeight: 64,
                      width: 'auto',
                    }}
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 text-white font-bold shadow-lg">
                    {(profile as any)?.organizations?.name?.substring(0, 1) ||
                      (profile?.nome ? profile.nome.substring(0, 1) : 'L')}
                  </div>
                )
              ) : (
                <div className="mx-auto h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                  <ChefHat size={20} />
                </div>
              )}

              {!isCollapsed && !theme?.company_logo_url && !theme?.logo_url && (
                <div className="flex items-center gap-2">
                  <span
                    className="text-xl font-bold tracking-tight"
                    style={{ color: 'var(--sidebar-text)' }}
                  >
                    {theme?.name || 'Confectio'}
                  </span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={toggleSidebar}
            className="absolute -right-3 top-1/2 z-50 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:border-pink-200 hover:text-pink-600 lg:flex"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <X size={14} />}
          </button>

          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Área de Favoritos */}
      {pinnedPages.length > 0 && (
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--sidebar-active-text)' }}>
          {!isCollapsed && (
            <h3 className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-green-700">
              <Star className="h-3 w-3" /> Favoritos
            </h3>
          )}
          <div className={`space-y-1 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
            {permissoesLoading
              ? // Skeleton para favoritos enquanto permissões carregam
                Array.from({ length: isCollapsed ? 3 : 5 }).map((_, i) => (
                  <div
                    key={`fav-skel-${i}`}
                    className={`h-3 ${isCollapsed ? 'w-3' : 'w-full'} rounded bg-slate-200 animate-pulse`}
                  />
                ))
              : pinnedPages.slice(0, isCollapsed ? 5 : 10).map((href) => {
                  const item =
                    visibleMenu.find((si) => si.href === href) ||
                    visibleMenu.find((si) => si.children?.some((c) => c.href === href));
                  if (!item) return null;

                  const childItem = item.children?.find((c) => c.href === href);
                  if (
                    childItem &&
                    childItem.allowedRoles &&
                    !childItem.allowedRoles.includes(profile?.role ?? '')
                  )
                    return null;
                  const displayItem = childItem || item;

                  const moduleId = getModuleId(displayItem as SidebarItem);
                  const iconEl = React.isValidElement(displayItem.icon)
                    ? React.cloneElement(displayItem.icon as React.ReactElement<any>, {
                        className: `h-4 w-4 ${getIconColor(moduleId)}`,
                      })
                    : displayItem.icon;

                  return (
                    <Link
                      key={`fav-${displayItem.href}`}
                      href={displayItem.href}
                      onClick={handleNavClick}
                      onMouseEnter={() =>
                        setHoveredItem((displayItem as any).id ?? displayItem.href)
                      }
                      onMouseLeave={() => setHoveredItem(null)}
                      className={`flex items-center rounded-md p-2 text-sm transition-colors text-slate-600 ${!isCollapsed ? 'gap-3' : 'justify-center'}`}
                      title={isCollapsed ? displayItem.name : undefined}
                      style={
                        hoveredItem === ((displayItem as any).id ?? displayItem.href)
                          ? {
                              backgroundColor: 'var(--sidebar-hover-bg)',
                              color: 'var(--sidebar-active-text)',
                              opacity: 0.92,
                            }
                          : undefined
                      }
                    >
                      <span style={{ color: 'var(--sidebar-text)' }}>{iconEl}</span>
                      {!isCollapsed && (
                        <span
                          className="truncate font-medium"
                          style={{ color: 'var(--sidebar-text)' }}
                        >
                          {displayItem.name}
                        </span>
                      )}
                    </Link>
                  );
                })}
          </div>
        </div>
      )}

      {/* Navegação Principal */}
      <nav
        className="custom-scrollbar flex-1 overflow-y-auto p-3"
        style={{ color: 'var(--sidebar-text)' }}
      >
        {permissoesLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={`skel-${i}`} className="h-4 w-full rounded bg-slate-200 animate-pulse" />
            ))}
          </div>
        ) : (
          <ul className="space-y-1">
            {visibleMenu.map((item) => {
              // item já foi filtrado por hasAccess via visibleMenu
              const moduleId = getModuleId(item);
              const active = isActive(item.href) || isSubmenuActive(item);
              const isHovered = hoveredItem === ((item as any).id ?? item.href);

              const itemStyle = active
                ? {
                    backgroundColor: 'var(--sidebar-active-bg, rgba(59,130,246,0.08))',
                    color: 'var(--sidebar-active-text, #0f172a)',
                    boxShadow: 'inset 4px 0 0 var(--sidebar-accent, #f59e0b)',
                  }
                : isHovered
                  ? {
                      backgroundColor: 'var(--sidebar-hover-bg, rgba(15,23,42,0.06))',
                      color: 'var(--sidebar-active-text, #0f172a)',
                      opacity: 0.98,
                    }
                  : undefined;

              const visibleChildren = item.children || [];

              const iconEl = React.isValidElement(item.icon)
                ? React.cloneElement(item.icon as React.ReactElement<any>, {
                    className: `h-5 w-5 ${getIconColor(moduleId)}`,
                  })
                : item.icon;

              return (
                <li key={item.name} className={`${(item as any).mobileOnly ? 'lg:hidden' : ''}`}>
                  <div
                    className={`group relative flex cursor-pointer items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200`}
                    onClick={() => (visibleChildren.length > 0 ? toggleSubmenu(item.name) : null)}
                    onMouseEnter={() => setHoveredItem((item as any).id ?? item.href)}
                    onMouseLeave={() => setHoveredItem(null)}
                    style={itemStyle}
                  >
                    {!visibleChildren || visibleChildren.length === 0 ? (
                      <Link
                        href={item.href}
                        onClick={handleNavClick}
                        className={`flex flex-1 items-center ${!isCollapsed ? 'gap-3' : 'justify-center'}`}
                      >
                        <span
                          style={{
                            color: active ? 'var(--sidebar-active-text)' : 'var(--sidebar-text)',
                          }}
                        >
                          {iconEl}
                        </span>
                        {!isCollapsed && <span className="flex-1">{item.name}</span>}
                      </Link>
                    ) : (
                      <div
                        className={`flex flex-1 items-center ${!isCollapsed ? 'gap-3' : 'justify-center'}`}
                      >
                        <span
                          style={{
                            color: active ? 'var(--sidebar-active-text)' : 'var(--sidebar-text)',
                          }}
                        >
                          {iconEl}
                        </span>
                        {!isCollapsed && (
                          <>
                            <span className="flex-1">{item.name}</span>
                            <ChevronRight
                              className={`h-4 w-4 transition-transform duration-200 ${openSubmenu === item.name ? 'rotate-90' : ''}`}
                              style={{ color: 'var(--sidebar-text)' }}
                            />
                          </>
                        )}
                      </div>
                    )}

                    {!isCollapsed && !item.children && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          togglePinPage(item.href);
                        }}
                        className={`ml-2 opacity-60 transition-opacity group-hover:opacity-100 ${isPagePinned(item.href) ? 'opacity-100' : ''}`}
                        style={
                          isPagePinned(item.href)
                            ? { color: 'var(--yellow-400, #f6c90a)' }
                            : { color: 'var(--sidebar-active-text)' }
                        }
                      >
                        <Star
                          size={14}
                          fill={isPagePinned(item.href) ? 'currentColor' : 'none'}
                          stroke={'var(--sidebar-active-text)'}
                          strokeWidth={1.5}
                        />
                      </button>
                    )}

                    {isCollapsed &&
                      (hoveredItem === ((item as any).id ?? item.href) ? (
                        <div className="absolute left-14 top-1/2 z-50 ml-2 w-max -translate-y-1/2 rounded-md bg-slate-800 px-2 py-1 text-xs text-white shadow-lg whitespace-nowrap">
                          {item.name}
                        </div>
                      ) : null)}
                  </div>

                  {!isCollapsed &&
                    visibleChildren &&
                    visibleChildren.length > 0 &&
                    openSubmenu === item.name && (
                      <ul className="mt-1 ml-9 animate-fade-up space-y-1 border-l border-slate-200 pl-2">
                        {visibleChildren.map((child) => {
                          const childActive = isActive(child.href);
                          const childIsHovered = hoveredItem === child.href;
                          return (
                            <li key={child.name}>
                              <div className="group/sub flex items-center justify-between">
                                <Link
                                  href={child.href}
                                  onMouseEnter={() => setHoveredItem(child.href)}
                                  onMouseLeave={() => setHoveredItem(null)}
                                  className={`flex-1 block rounded-md px-3 py-2 text-sm transition-colors`}
                                  style={
                                    childActive
                                      ? {
                                          backgroundColor:
                                            'var(--sidebar-active-bg, rgba(59,130,246,0.08))',
                                          color: 'var(--sidebar-active-text, #0f172a)',
                                          boxShadow: 'inset 4px 0 0 var(--sidebar-accent, #f59e0b)',
                                        }
                                      : childIsHovered
                                        ? {
                                            backgroundColor:
                                              'var(--sidebar-hover-bg, rgba(15,23,42,0.06))',
                                            color: 'var(--sidebar-active-text, #0f172a)',
                                            opacity: 0.98,
                                          }
                                        : undefined
                                  }
                                >
                                  {child.name}
                                </Link>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    togglePinPage(child.href);
                                  }}
                                  className={`pr-2 opacity-60 transition-opacity group-hover/sub:opacity-100 ${isPagePinned(child.href) ? 'opacity-100' : ''}`}
                                  style={
                                    isPagePinned(child.href)
                                      ? { color: 'var(--yellow-400, #f6c90a)' }
                                      : { color: 'var(--sidebar-active-text)' }
                                  }
                                >
                                  <Star
                                    size={12}
                                    fill={isPagePinned(child.href) ? 'currentColor' : 'none'}
                                    stroke={'var(--sidebar-active-text)'}
                                    strokeWidth={1.2}
                                  />
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      {/* Footer do Sidebar (Perfil) - desativado temporariamente */}
      {SHOW_SIDEBAR_FOOTER ? (
        <div
          className={`border-t border-slate-100 p-4 ${isCollapsed ? 'flex justify-center' : ''}`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-bold text-slate-500">
              {profile?.nome ? profile.nome.substring(0, 2).toUpperCase() : 'US'}
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-700">
                  {profile?.nome || 'Usuário'}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {profile?.email || 'email@confectio.com'}
                </p>
              </div>
            )}
          </div>
          {/* debug panel removed per request */}
        </div>
      ) : null}
    </aside>
  );
}
