'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';

import { useTheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';

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

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  children?: {
    name: string;
    href: string;
  }[];
  adminOnly?: boolean;
}

const sidebarItems: SidebarItem[] = [
  {
    name: 'Visão Geral',
    href: '/dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    name: 'Agenda',
    href: '/dashboard/agenda',
    icon: <Calendar className="h-5 w-5" />,
  },
  {
    name: 'Planejamento',
    href: '/dashboard/producao/planejamento',
    icon: <ClipboardList className="h-5 w-5" />,
  },
  {
    name: 'Fábrica',
    href: '/dashboard/producao',
    icon: <Factory className="h-5 w-5" />,
    children: [
      { name: 'Chão de Fábrica (Kanban)', href: '/dashboard/producao/kanban' },
      { name: 'Ordens de Produção', href: '/dashboard/producao/ordens' },
      { name: 'Produtos Finais', href: '/dashboard/producao/produtos' },
      { name: 'Fichas Técnicas', href: '/dashboard/producao/fichas-tecnicas' },
    ],
  },
  {
    name: 'PDV & Lojas',
    href: '/dashboard/pdv',
    icon: <Store className="h-5 w-5" />,
    children: [
      { name: 'Frente de Caixa', href: '/dashboard/pdv/caixa' },
      { name: 'Controle de Caixa', href: '/dashboard/pdv/controle-caixa' },
      { name: 'Recebimento Carga', href: '/dashboard/pdv/recebimento' },
    ],
  },
  {
    name: 'Logística',
    href: '/dashboard/logistica',
    icon: <Truck className="h-5 w-5" />,
    children: [{ name: 'Expedição', href: '/dashboard/logistica/expedicao' }],
  },
  {
    name: 'Suprimentos',
    href: '/dashboard/insumos',
    icon: <Package className="h-5 w-5" />,
    children: [
      { name: 'Sugestão de Compras (MRP)', href: '/dashboard/compras/sugestao' },
      { name: 'Pedidos de Compra', href: '/dashboard/insumos/pedidos-compra' },
      { name: 'Entrada de Notas', href: '/dashboard/insumos/lotes' },
      { name: 'Monitor de Riscos', href: '/dashboard/insumos/alertas' },
      { name: 'Cadastro de Insumos', href: '/dashboard/insumos/cadastro' },
      { name: 'Categorias', href: '/dashboard/insumos/categorias' },
      { name: 'Fornecedores', href: '/dashboard/fornecedores' },
    ],
  },
  {
    name: 'Relatórios',
    href: '/dashboard/relatorios',
    icon: <BarChart2 className="h-5 w-5" />,
    children: [
      { name: 'Painel Gerencial', href: '/dashboard/relatorios' },
      { name: 'Vendas Detalhadas', href: '/dashboard/relatorios/vendas' },
      { name: 'Posição de Estoque', href: '/dashboard/relatorios/estoque' },
      { name: 'Validade & Perdas', href: '/dashboard/relatorios/validade' },
      { name: 'Acompanhamento de Metas', href: '/dashboard/relatorios/metas' },
      { name: 'Histórico de Caixas', href: '/dashboard/relatorios/fechamentos' },
    ],
  },
  {
    name: 'Configurações',
    href: '/dashboard/configuracoes',
    icon: <Settings className="h-5 w-5" />,
    children: [
      { name: 'Sistema & Regras', href: '/dashboard/configuracoes' },
      { name: 'Cadastro de Lojas', href: '/dashboard/configuracoes/lojas' },
      { name: 'Promoções & Combos', href: '/dashboard/configuracoes/promocoes' },
      { name: 'Equipe & Usuários', href: '/dashboard/configuracoes/usuarios' },
      { name: 'Gestão de Metas', href: '/dashboard/configuracoes/metas' },
      { name: 'Gestão de Fidelidade', href: '/dashboard/configuracoes/fidelidade' },
    ],
  },
  {
    name: 'Ajuda',
    href: '/dashboard/ajuda',
    icon: <HelpCircle className="h-5 w-5" />,
  },
  {
    name: 'Admin Master',
    href: '/dashboard/admin',
    icon: <Shield className="h-5 w-5 text-purple-500" />,
    adminOnly: true,
    children: [
      { name: 'Novo Cliente', href: '/dashboard/admin/novo-cliente' },
      { name: 'Equipe & Usuários', href: '/dashboard/configuracoes/usuarios' },
    ],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>('Produção');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const pathname = usePathname();

  const { pinnedPages, togglePinPage, isPagePinned } = usePageTracking();
  const { theme, loading } = useTheme();
  const { profile } = useAuth();

  const logoSrc = ((): string | null => {
    const company = theme?.company_logo_url?.toString?.().trim();
    const logo = theme?.logo_url?.toString?.().trim();
    if (company) return company;
    if (logo) return logo;
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

  const isActive = (href: string) => pathname === href;
  const isSubmenuActive = (item: SidebarItem) =>
    item.children?.some((child) => pathname === child.href);

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
              {/* Logo da empresa */}
              {!isCollapsed && logoSrc && (
                <img
                  src={logoSrc}
                  alt="Logo"
                  className="h-8 w-auto object-contain"
                  style={{
                    maxHeight: 32,
                    transform: `scale(var(--company-logo-scale, var(--logo-scale, ${theme?.company_logo_scale ?? theme?.logo_scale ?? 1})))`,
                    transformOrigin: 'left center',
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}

              {(isCollapsed || (!theme?.logo_url && !theme?.company_logo_url && !loading)) && (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 text-white font-bold shadow-lg shadow-pink-500/20">
                  {isCollapsed ? 'C' : <ChefHat size={20} />}
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
            {pinnedPages.slice(0, isCollapsed ? 5 : 10).map((href) => {
              const item =
                sidebarItems.find((si) => si.href === href) ||
                sidebarItems.find((si) => si.children?.some((c) => c.href === href));
              if (!item) return null;

              const childItem = item.children?.find((c) => c.href === href);
              const displayItem = childItem || item;

              return (
                <Link
                  key={`fav-${displayItem.href}`}
                  href={displayItem.href}
                  onMouseEnter={() => setHoveredItem(displayItem.href)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`flex items-center rounded-md p-2 text-sm transition-colors text-slate-600 ${!isCollapsed ? 'gap-3' : 'justify-center'}`}
                  title={isCollapsed ? displayItem.name : undefined}
                  style={
                    hoveredItem === displayItem.href
                      ? {
                          backgroundColor: 'var(--sidebar-hover-bg)',
                          color: 'var(--sidebar-active-text)',
                          opacity: 0.92,
                        }
                      : undefined
                  }
                >
                  <span style={{ color: 'var(--sidebar-text)' }}>
                    {childItem ? <ChevronRight size={14} /> : item.icon}
                  </span>
                  {!isCollapsed && (
                    <span className="truncate font-medium" style={{ color: 'var(--sidebar-text)' }}>
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
        <ul className="space-y-1">
          {sidebarItems.map((item) => {
            // Bloqueio de segurança para itens Master
            if (item.adminOnly && profile?.role !== 'master') return null;

            const active = isActive(item.href) || isSubmenuActive(item);
            const isHovered = hoveredItem === item.href;

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

            return (
              <li key={item.name}>
                <div
                  className={`group relative flex cursor-pointer items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200`}
                  onClick={() => (item.children ? toggleSubmenu(item.name) : null)}
                  onMouseEnter={() => setHoveredItem(item.href)}
                  onMouseLeave={() => setHoveredItem(null)}
                  style={itemStyle}
                >
                  {!item.children ? (
                    <Link
                      href={item.href}
                      className={`flex flex-1 items-center ${!isCollapsed ? 'gap-3' : 'justify-center'}`}
                    >
                      <span
                        style={{
                          color: active ? 'var(--sidebar-active-text)' : 'var(--sidebar-text)',
                        }}
                      >
                        {item.icon}
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
                        {item.icon}
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

                  {isCollapsed && (
                    <div className="pointer-events-none absolute left-14 top-1/2 z-50 ml-2 w-max -translate-y-1/2 rounded-md bg-slate-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                      {item.name}
                    </div>
                  )}
                </div>

                {!isCollapsed && item.children && openSubmenu === item.name && (
                  <ul className="mt-1 ml-9 animate-fade-up space-y-1 border-l border-slate-200 pl-2">
                    {item.children.map((child) => {
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
      </nav>

      {/* Footer do Sidebar (Perfil) */}
      <div className={`border-t border-slate-100 p-4 ${isCollapsed ? 'flex justify-center' : ''}`}>
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
      </div>
    </aside>
  );
}
