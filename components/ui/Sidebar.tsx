// Função utilitária para cor primária com opacidade
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useTheme } from '@/lib/theme';
import { usePageTracking } from '@/hooks/usePageTracking';
import {
  Home,
  Package,
  Truck,
  Settings,
  Menu,
  X,
  ChevronRight,
  BarChart2,
  Factory,
  Star,
} from 'lucide-react';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  children?: {
    name: string;
    href: string;
  }[];
}

const sidebarItems: SidebarItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: <Home className="h-5 w-5" />,
  },
  {
    name: 'Mercadorias',
    href: '/dashboard/insumos',
    icon: <Package className="h-5 w-5" />,
    children: [
      { name: 'Cadastro Produto', href: '/dashboard/insumos/cadastro' },
      { name: 'Estoque', href: '/dashboard/insumos/lotes' },
      { name: 'Alertas', href: '/dashboard/insumos/alertas' },
      { name: 'Categorias', href: '/dashboard/producao/categorias' },
      { name: 'Ordem de Compra', href: '/dashboard/producao/pedidos-compra' },
    ],
  },
  {
    name: 'Fornecedores',
    href: '/dashboard/fornecedores',
    icon: <Truck className="h-5 w-5" />,
  },
  {
    name: 'Produção',
    href: '/dashboard/producao',
    icon: <Factory className="h-5 w-5" />,
    children: [
      { name: 'Produto Final', href: '/dashboard/producao/produtos' },
      { name: 'Ordens de Produção', href: '/dashboard/producao/ordens' },
      { name: 'Fichas Técnicas', href: '/dashboard/producao/fichas-tecnicas' },
      { name: 'Relatórios', href: '/dashboard/producao/relatorios' },
    ],
  },

  {
    name: 'Relatórios',
    href: '/dashboard/relatorios',
    icon: <BarChart2 className="h-5 w-5" />,
    children: [
      { name: 'Validade', href: '/dashboard/relatorios/validade' },
      { name: 'Estoque', href: '/dashboard/relatorios/estoque' },
    ],
  },
  {
    name: 'Configurações',
    href: '/dashboard/configuracoes',
    icon: <Settings className="h-5 w-5" />,
  },
];

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const pathname = usePathname();
  const { pinnedPages, togglePinPage, isPagePinned } = usePageTracking();

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

  const { theme, loading } = useTheme();

  return (
    <>
      {/* Overlay for mobile */}
      {!isCollapsed && (
        <div className="fixed inset-0 z-40 bg-overlay-mobile lg:hidden" onClick={toggleSidebar} />
      )}

      <div
        className={`
          fixed inset-y-0 left-0 z-50
          flex flex-col
          border-r transition-all duration-300
          ease-in-out lg:translate-x-0
          ${isCollapsed ? 'w-20 -translate-x-full' : 'w-64 translate-x-0'}
        `}
        style={{
          background: 'var(--secondary)',
          borderColor: 'var(--primary)',
        }}
      >
        {/* Header */}
        <div className="flex flex-col border-b px-4 py-4" style={{ borderColor: 'var(--primary)' }}>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex flex-1 justify-center">
              <div className="flex items-center gap-2">
                {/* Logo da Empresa (Marca B - foco na personalização do cliente) */}
                {theme?.company_logo_url && !isCollapsed && (
                  <div className="flex-shrink-0">
                    <Image
                      src={theme.company_logo_url}
                      alt="Logo da Empresa"
                      width={32}
                      height={32}
                      className="rounded object-contain"
                      unoptimized
                      loading="eager"
                      style={{
                        width: `calc(32px * var(--company-logo-scale, 1))`,
                        height: `calc(32px * var(--company-logo-scale, 1))`,
                        maxWidth: '160px',
                        maxHeight: '160px',
                      }}
                    />
                  </div>
                )}
                {/* Ícone quando menu está encolhido */}
                {isCollapsed && <Menu className="h-6 w-6 text-primary" />}
                {/* Fallback quando não há logo da empresa */}
                {(!theme?.company_logo_url || isCollapsed) && !loading && (
                  <div className="text-center">
                    <span className="block truncate text-sm font-semibold text-gray-800 dark:text-white">
                      {theme?.name || 'SysLari'}
                    </span>
                  </div>
                )}
              </div>
            </div>
            {/* Botão interno para desktop */}
            <button
              onClick={toggleSidebar}
              className="absolute right-2 top-2 hidden rounded-md p-2 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-800 lg:block"
            >
              {isCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
            </button>

            {/* Botão externo para mobile */}
            <button
              onClick={toggleSidebar}
              className={`
                fixed left-4
                top-4 z-50 rounded-md
                bg-white p-2 shadow-md hover:bg-gray-100
                dark:bg-gray-900 dark:text-white
                dark:hover:bg-gray-800
                lg:hidden
                ${!isCollapsed && 'hidden'}
              `}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
          {!isCollapsed && !loading && !theme?.company_logo_url && (
            <div className="text-center">
              <span className="block truncate text-sm font-semibold text-gray-800 dark:text-white">
                {theme?.name || 'SysLari'}
              </span>
            </div>
          )}
        </div>

        {/* Favoritos */}
        {pinnedPages.length > 0 && (
          <div className="border-b border-gray-200 px-4 py-2 dark:border-gray-700">
            {!isCollapsed && (
              <h3 className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <Star className="h-3 w-3" />
                Favoritos
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
                const displayHref = childItem?.href || item.href;

                return (
                  <Link
                    key={`fav-${displayHref}`}
                    href={displayHref}
                    className={`
                      flex items-center rounded-md p-2
                      transition-all duration-200
                      ${!isCollapsed ? 'space-x-2' : 'w-full justify-center'}
                      ${
                        isActive(displayHref)
                          ? 'bg-sidebar-active-bg text-sidebar-active-text dark:bg-indigo-900/50 dark:text-indigo-400'
                          : 'text-gray-600 hover:bg-sidebar-hover dark:text-gray-300 dark:hover:bg-gray-800'
                      }
                    `}
                    title={isCollapsed ? displayItem.name : undefined}
                  >
                    {item.icon}
                    {!isCollapsed && <span className="truncate">{displayItem.name}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-2">
            {sidebarItems.map((item) => (
              <li key={item.name}>
                <div
                  className={`group relative flex items-center rounded-md p-2 transition-all duration-200 ${
                    isActive(item.href) || isSubmenuActive(item)
                      ? 'text-sidebar-active-text dark:text-indigo-400'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                  style={
                    isActive(item.href) || isSubmenuActive(item)
                      ? { background: 'var(--primary)' }
                      : { transition: 'background 0.2s' }
                  }
                  onMouseEnter={(e) => {
                    if (!isActive(item.href) && !isSubmenuActive(item)) {
                      (e.currentTarget as HTMLElement).style.background = 'var(--primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive(item.href) && !isSubmenuActive(item)) {
                      (e.currentTarget as HTMLElement).style.background = '';
                    }
                  }}
                >
                  <Link
                    href={item.href}
                    className={`flex flex-1 items-center ${!isCollapsed ? 'space-x-2' : 'justify-center'}`}
                    onClick={() => {
                      // Se houver filhos, apenas abre/fecha o submenu sem prevenir navegação
                      if (item.children) {
                        toggleSubmenu(item.name);
                      }
                    }}
                    title={isCollapsed ? item.name : undefined}
                  >
                    {item.icon}
                    {!isCollapsed && (
                      <>
                        <span>{item.name}</span>
                        {item.children && (
                          <ChevronRight
                            className={`
                              ml-auto h-4 w-4 transition-transform
                              ${openSubmenu === item.name ? 'rotate-90' : ''}
                            `}
                          />
                        )}
                      </>
                    )}
                  </Link>

                  {/* Botão de favorito */}
                  {!isCollapsed && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        togglePinPage(item.href);
                      }}
                      className={`rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 ${
                        isPagePinned(item.href)
                          ? 'text-yellow-500 hover:text-yellow-600'
                          : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                      }`}
                      title={
                        isPagePinned(item.href)
                          ? 'Remover dos favoritos'
                          : 'Adicionar aos favoritos'
                      }
                    >
                      <Star
                        className="h-3 w-3"
                        fill={isPagePinned(item.href) ? 'currentColor' : 'none'}
                      />
                    </button>
                  )}

                  {/* Botão de favorito para sidebar colapsada */}
                  {isCollapsed && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        togglePinPage(item.href);
                      }}
                      className={`absolute -right-2 -top-2 rounded-full border bg-white p-1 shadow-md dark:bg-gray-800 ${
                        isPagePinned(item.href)
                          ? 'border-yellow-200 text-yellow-500'
                          : 'border-gray-200 text-gray-400'
                      }`}
                      title={
                        isPagePinned(item.href)
                          ? 'Remover dos favoritos'
                          : 'Adicionar aos favoritos'
                      }
                    >
                      <Star
                        className="h-3 w-3"
                        fill={isPagePinned(item.href) ? 'currentColor' : 'none'}
                      />
                    </button>
                  )}
                </div>

                {/* Submenu */}
                {/* Submenu para sidebar expandida */}
                {!isCollapsed && item.children && openSubmenu === item.name && (
                  <ul className="ml-6 mt-2 space-y-2 border-l-2 border-gray-200">
                    {item.children.map((child) => (
                      <li key={child.name}>
                        <div
                          className={`group flex items-center rounded-md p-2 pl-4 ${
                            isActive(child.href)
                              ? 'text-sidebar-active-text dark:text-indigo-400'
                              : 'text-gray-600 dark:text-gray-400'
                          }`}
                          style={
                            isActive(child.href) ? { background: 'var(--primary)' } : undefined
                          }
                          onMouseEnter={(e) => {
                            if (!isActive(child.href)) {
                              const color = getPrimaryWithOpacity(theme, 0.8);
                              (e.currentTarget as HTMLElement).style.background = color;
                              (e.currentTarget as HTMLElement).style.color = '#fff';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive(child.href)) {
                              (e.currentTarget as HTMLElement).style.background = '';
                              (e.currentTarget as HTMLElement).style.color = '';
                            }
                          }}
                        >
                          <Link href={child.href} className="flex-1">
                            {child.name}
                          </Link>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              togglePinPage(child.href);
                            }}
                            className={`ml-2 rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 ${
                              isPagePinned(child.href)
                                ? 'text-yellow-500 hover:text-yellow-600'
                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                            }`}
                            title={
                              isPagePinned(child.href)
                                ? 'Remover dos favoritos'
                                : 'Adicionar aos favoritos'
                            }
                          >
                            <Star
                              className="h-3 w-3"
                              fill={isPagePinned(child.href) ? 'currentColor' : 'none'}
                            />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Tooltip submenu para sidebar colapsada */}
                {isCollapsed && item.children && (
                  <div
                    className={`
                      invisible absolute left-full top-0 
                      z-50 ml-2 
                      rounded-md border
                      border-gray-200 bg-white opacity-0
                      shadow-lg transition-all duration-200 group-hover:visible
                      group-hover:opacity-100 dark:border-gray-700
                      dark:bg-gray-800
                    `}
                  >
                    <ul className="w-48 py-2">
                      {item.children.map((child) => (
                        <li key={child.name}>
                          <div className="flex items-center justify-between">
                            <Link
                              href={child.href}
                              className={`flex-1 px-4 py-2 ${isActive(child.href) ? 'text-sidebar-active-text dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400'}`}
                              style={
                                isActive(child.href) ? { background: 'var(--primary)' } : undefined
                              }
                              onMouseEnter={(e) => {
                                if (!isActive(child.href)) {
                                  const color = getPrimaryWithOpacity(theme, 0.8);
                                  (e.currentTarget as HTMLElement).style.background = color;
                                  (e.currentTarget as HTMLElement).style.color = '#fff';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isActive(child.href)) {
                                  (e.currentTarget as HTMLElement).style.background = '';
                                  (e.currentTarget as HTMLElement).style.color = '';
                                }
                              }}
                            >
                              {child.name}
                            </Link>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                togglePinPage(child.href);
                              }}
                              className={`
                                mr-2 rounded p-1
                                transition-colors duration-200
                                ${
                                  isPagePinned(child.href)
                                    ? 'text-yellow-500 hover:text-yellow-600'
                                    : 'text-gray-400 hover:text-yellow-500'
                                }
                              `}
                              title={
                                isPagePinned(child.href)
                                  ? 'Remover dos favoritos'
                                  : 'Adicionar aos favoritos'
                              }
                            >
                              <Star
                                size={14}
                                fill={isPagePinned(child.href) ? 'currentColor' : 'none'}
                              />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
}

// Função utilitária para cor primária com opacidade
import type { ThemeSettings } from '@/lib/types';

function getPrimaryWithOpacity(_theme: Partial<ThemeSettings> | undefined, opacity: number) {
  // Busca a cor da variável CSS --primary, que sempre reflete a cor customizada
  let color = '#88544c';
  if (typeof window !== 'undefined') {
    const cssPrimary = getComputedStyle(document.documentElement)
      .getPropertyValue('--primary')
      .trim();
    if (cssPrimary) color = cssPrimary;
  }
  if (typeof color === 'string' && color.startsWith('#') && color.length === 7) {
    // hex para rgba
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${opacity})`;
  } else if (typeof color === 'string' && color.startsWith('rgb')) {
    // rgb para rgba
    return color.replace('rgb', 'rgba').replace(')', `,${opacity})`);
  }
  return color;
}
