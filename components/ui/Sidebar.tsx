'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

// --- Interfaces ---
interface SidebarChild {
  name: string;
  href: string;
  allowedRoles?: string[];
  id?: string;
  icon?: React.ReactNode;
}

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  children?: SidebarChild[];
  adminOnly?: boolean;
  allowedRoles?: string[];
  id?: string;
}

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
  logoUrl?: string;
}

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
    children: [
      { id: 'logistica_expedicao', name: 'Expedição', href: '/dashboard/logistica/expedicao' },
    ],
  },
  {
    id: 'suprimentos',
    name: 'Suprimentos',
    href: '/dashboard/insumos',
    icon: <Package className="h-5 w-5" />,
    allowedRoles: ['admin', 'fabrica', 'master'],
    children: [
      {
        id: 'compras_sugestao',
        name: 'Sugestão de Compras (MRP)',
        href: '/dashboard/compras/sugestao',
      },
      {
        id: 'pedidos_compra',
        name: 'Pedidos de Compra',
        href: '/dashboard/insumos/pedidos-compra',
      },
      { id: 'insumos_estoque', name: 'Estoque', href: '/dashboard/insumos/lotes' },
      { id: 'insumos_alertas', name: 'Monitor de Riscos', href: '/dashboard/insumos/alertas' },
      { id: 'insumos_cadastro', name: 'Cadastro de Insumos', href: '/dashboard/insumos/cadastro' },
      { id: 'insumos_categorias', name: 'Categorias', href: '/dashboard/insumos/categorias' },
      { id: 'fornecedores', name: 'Fornecedores', href: '/dashboard/fornecedores' },
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
  {
    id: 'relatorios',
    name: 'Relatórios',
    href: '/dashboard/relatorios',
    icon: <BarChart2 className="h-5 w-5" />,
    allowedRoles: ['admin', 'master', 'pdv'],
    children: [
      { id: 'relatorios_painel', name: 'Painel Gerencial', href: '/dashboard/relatorios' },
      {
        id: 'relatorios_vendas',
        name: 'Vendas Consolidadas',
        href: '/dashboard/relatorios/vendas',
      },
      {
        id: 'relatorios_historico_caixa',
        name: 'Histórico de Fechamentos',
        href: '/dashboard/pdv/historico-caixa',
      },
      {
        id: 'relatorios_estoque',
        name: 'Posição de Estoque',
        href: '/dashboard/relatorios/estoque',
      },
      {
        id: 'relatorios_validade',
        name: 'Validade & Perdas',
        href: '/dashboard/relatorios/validade',
      },
    ],
  },
  {
    id: 'configuracoes',
    name: 'Configurações',
    href: '/dashboard/configuracoes',
    icon: <Settings className="h-5 w-5" />,
    allowedRoles: ['admin', 'master'],
    children: [
      {
        id: 'configuracoes_sistema',
        name: 'Sistema & Regras',
        href: '/dashboard/configuracoes/sistema',
      },
      {
        id: 'configuracoes_permissoes',
        name: 'Permissões',
        href: '/dashboard/configuracoes/permissoes',
        allowedRoles: ['admin', 'master'],
      },
      {
        id: 'configuracoes_customizacao',
        name: 'Aparência & Tema',
        href: '/dashboard/configuracoes/customizacao',
      },
      {
        id: 'configuracoes_lojas',
        name: 'Cadastro de Lojas',
        href: '/dashboard/configuracoes/lojas',
      },
      {
        id: 'configuracoes_promocoes',
        name: 'Promoções & Combos',
        href: '/dashboard/configuracoes/promocoes',
      },
      {
        id: 'configuracoes_usuarios',
        name: 'Equipe & Usuários',
        href: '/dashboard/configuracoes/usuarios',
      },
      {
        id: 'configuracoes_metas',
        name: 'Gestão de Metas',
        href: '/dashboard/configuracoes/metas',
      },
      {
        id: 'configuracoes_fidelidade',
        name: 'Gestão de Fidelidade',
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
        id: 'admin_usuarios',
        name: 'Equipe & Usuários',
        href: '/dashboard/configuracoes/usuarios',
      },
    ],
  },
];

export default function Sidebar({ isOpen, onClose, logoUrl }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
  const pathname = usePathname();

  const { pinnedPages, togglePinPage, isPagePinned } = usePageTracking();
  const { theme } = useTheme();
  const { profile } = useAuth();
  const [permissoes, setPermissoes] = useState<Record<string, string[]>>({});
  const [permissoesLoading, setPermissoesLoading] = useState(true);

  useEffect(() => {
    async function carregarPermissoes() {
      if (!profile?.organization_id) return setPermissoesLoading(false);
      try {
        const { data: globalData } = await supabase
          .from('configuracoes_sistema')
          .select('valor')
          .eq('chave', 'permissoes_acesso')
          .is('organization_id', null)
          .maybeSingle();

        const { data: orgData } = await supabase
          .from('configuracoes_sistema')
          .select('valor')
          .eq('chave', 'permissoes_acesso')
          .eq('organization_id', profile.organization_id)
          .maybeSingle();

        const parseValor = (valor: unknown): Record<string, string[]> => {
          if (!valor) return {};
          if (typeof valor === 'string') {
            try {
              return JSON.parse(valor);
            } catch {
              return {};
            }
          }
          if (typeof valor === 'object') return valor as Record<string, string[]>;
          return {};
        };

        const merged = {
          ...DEFAULT_PERMISSOES,
          ...parseValor(globalData?.valor),
          ...parseValor(orgData?.valor),
        };
        setPermissoes(merged);
      } catch {
        setPermissoes(DEFAULT_PERMISSOES);
      } finally {
        setPermissoesLoading(false);
      }
    }
    void carregarPermissoes();
  }, [profile?.organization_id]);

  const logoSrc = useMemo(() => {
    const companyLogo =
      profile?.company_logo_url ||
      (profile as any)?.organizations?.logo_url ||
      theme?.company_logo_url;
    if (companyLogo && companyLogo.trim() !== '') return getImageUrl(companyLogo);
    if (logoUrl) return getImageUrl(logoUrl);
    if (theme?.logo_url) return getImageUrl(theme.logo_url);
    return null;
  }, [profile, theme, logoUrl]);

  const getIconColor = (id: string) => {
    const colors: Record<string, string> = {
      producao: 'text-amber-500',
      pdv: 'text-emerald-500',
      logistica: 'text-blue-500',
      suprimentos: 'text-purple-500',
      financeiro: 'text-cyan-500',
      relatorios: 'text-rose-500',
    };
    return colors[id] || 'text-slate-400';
  };

  // Helper para derivar id do módulo a partir do item
  const getModuleId = (item: SidebarItem) => {
    if ((item as any).id) return (item as any).id as string;
    try {
      const parts = item.href.split('/').filter(Boolean);
      return parts[parts.length - 1];
    } catch {
      return item.name.toLowerCase();
    }
  };

  const hasAccess = useCallback(
    (item: SidebarItem) => {
      // 'admin'/'master' elevated privileges; compare as string to avoid TS literal type issues
      const roleStr = String(profile?.role ?? '');
      if (item.adminOnly) return roleStr === 'master';
      if (roleStr === 'admin' || roleStr === 'master') return true;
      if (item.allowedRoles && !item.allowedRoles.includes(profile?.role ?? '')) return false;

      const rolePerms =
        permissoes[profile?.role ?? ''] || DEFAULT_PERMISSOES[profile?.role ?? ''] || [];
      if (rolePerms.includes('all')) return true;

      const moduleId = item.id || item.href.split('/').pop() || '';

      const hasModuleAccess = (id: string | undefined, allowedRoles?: string[]) => {
        if (!id) return false;
        if (allowedRoles && !allowedRoles.includes(profile?.role ?? '')) return false;
        return rolePerms.includes(id);
      };

      if (hasModuleAccess(moduleId, item.allowedRoles)) return true;

      if (item.children?.length) {
        return item.children.some((child) => {
          const childId = child.id || child.href.split('/').pop() || '';
          return hasModuleAccess(childId, child.allowedRoles);
        });
      }

      return false;
    },
    [permissoes, profile?.role]
  );

  const visibleMenu = useMemo(() => {
    return sidebarItems.filter(hasAccess).map((item) => ({
      ...item,
      children: item.children?.filter((child) => {
        const roleStr = String(profile?.role ?? '');
        if (roleStr === 'admin' || roleStr === 'master') return true;
        if (child.allowedRoles && !child.allowedRoles.includes(profile?.role ?? '')) return false;
        const rolePerms =
          permissoes[profile?.role ?? ''] || DEFAULT_PERMISSOES[profile?.role ?? ''] || [];
        if (rolePerms.includes('all')) return true;
        const childId = child.id || child.href.split('/').pop() || '';
        return rolePerms.includes(childId);
      }),
    }));
  }, [hasAccess, profile?.role, permissoes]);

  const handleNavClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024 && onClose) onClose();
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 ${isCollapsed ? 'w-20' : 'w-64'}`}
      style={{
        backgroundColor: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-active-text)',
      }}
    >
      <div className="relative flex h-20 items-center px-4 border-b border-slate-100">
        <div className={`flex flex-1 ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
          {!isCollapsed ? (
            <div className="flex items-center gap-3">
              {logoSrc && !logoError ? (
                <img
                  src={logoSrc}
                  alt="Logo"
                  className="h-20 w-auto object-contain"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-primary text-white font-black shadow-lg text-lg">
                  {(profile as any)?.organizations?.nome?.substring(0, 1) || 'L'}
                </div>
              )}
            </div>
          ) : (
            <ChefHat size={24} className="text-slate-400" />
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 items-center justify-center rounded-full border bg-white shadow-sm"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <X size={14} />}
        </button>
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
              ? Array.from({ length: isCollapsed ? 3 : 5 }).map((_, i) => (
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

      <nav className="custom-scrollbar flex-1 overflow-y-auto p-3 space-y-1">
        {permissoesLoading ? (
          <div className="space-y-3 p-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 bg-slate-100 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          visibleMenu.map((item) => {
            const active =
              pathname === item.href || item.children?.some((c) => pathname === c.href);
            return (
              <li key={item.id} className="list-none">
                <div
                  className={`flex items-center rounded-xl px-3 py-2.5 transition-all cursor-pointer ${active ? 'bg-primary/10' : 'hover:bg-slate-50'}`}
                  onClick={() =>
                    item.children
                      ? setOpenSubmenu(openSubmenu === (item.id ?? null) ? null : (item.id ?? null))
                      : null
                  }
                  onMouseEnter={() => setHoveredItem(item.id || null)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <Link
                    href={item.children ? '#' : item.href}
                    onClick={handleNavClick}
                    className={`flex flex-1 items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}
                  >
                    <span className={getIconColor(item.id || '')}>{item.icon}</span>
                    {!isCollapsed && (
                      <span
                        className={`flex-1 font-medium ${active ? 'text-primary font-bold' : 'text-slate-600'}`}
                      >
                        {item.name}
                      </span>
                    )}
                    {!isCollapsed && !item.children && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          togglePinPage(item.href);
                        }}
                        className={`ml-2 opacity-60 transition-opacity ${isPagePinned(item.href) ? 'opacity-100' : 'group-hover:opacity-100'}`}
                        style={
                          isPagePinned(item.href)
                            ? { color: 'var(--yellow-400, #f6c90a)' }
                            : { color: 'var(--sidebar-active-text)' }
                        }
                        title={isPagePinned(item.href) ? 'Desfixar página' : 'Fixar página'}
                      >
                        <Star
                          size={14}
                          fill={isPagePinned(item.href) ? 'currentColor' : 'none'}
                          stroke={'var(--sidebar-active-text)'}
                          strokeWidth={1.5}
                        />
                      </button>
                    )}
                  </Link>
                  {isCollapsed && hoveredItem === item.id && (
                    <div className="absolute left-16 bg-slate-800 text-white text-[11px] px-3 py-1.5 rounded shadow-xl z-50 whitespace-nowrap font-bold">
                      {item.name}
                    </div>
                  )}
                </div>
                {!isCollapsed && item.children && openSubmenu === item.id && (
                  <ul className="mt-1 ml-4 border-l-2 border-slate-100 pl-4 space-y-1">
                    {item.children.map((child) => (
                      <li key={child.href} className="list-none">
                        <div className="flex items-center justify-between">
                          <Link
                            href={child.href}
                            onClick={handleNavClick}
                            className={`block py-2 px-3 rounded-lg text-sm ${pathname === child.href ? 'text-primary font-bold bg-primary/5' : 'text-slate-500 hover:text-primary'}`}
                          >
                            {child.name}
                          </Link>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              togglePinPage(child.href);
                            }}
                            className={`pr-2 opacity-60 transition-opacity ${isPagePinned(child.href) ? 'opacity-100' : 'group-hover:opacity-100'}`}
                            style={
                              isPagePinned(child.href)
                                ? { color: 'var(--yellow-400, #f6c90a)' }
                                : { color: 'var(--sidebar-active-text)' }
                            }
                            title={isPagePinned(child.href) ? 'Desfixar página' : 'Fixar página'}
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
                    ))}
                  </ul>
                )}
              </li>
            );
          })
        )}
      </nav>
    </aside>
  );
}
