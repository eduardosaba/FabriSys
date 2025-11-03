'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useTheme } from '@/lib/theme';
import {
  Home,
  Package,
  Truck,
  Settings,
  Menu,
  X,
  ChevronRight,
  AlertTriangle,
  BarChart2,
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
    name: 'Produção',
    href: '/dashboard/insumos',
    icon: <Package className="h-5 w-5" />,
    children: [
      { name: 'Cadastro Produto', href: '/dashboard/insumos/cadastro' },
      { name: 'Estoque', href: '/dashboard/insumos/lotes' },
      { name: 'Alertas', href: '/dashboard/insumos/alertas' },
      { name: 'Categorias', href: '/dashboard/producao/categorias' },
      { name: 'Pedidos de Compra', href: '/dashboard/producao/pedidos-compra' },
    ],
  },
  {
    name: 'Fornecedores',
    href: '/dashboard/fornecedores',
    icon: <Truck className="h-5 w-5" />,
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
        <div
          className="fixed inset-0 bg-black bg-opacity-50 lg:hidden z-40"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50
          flex flex-col
          bg-white border-r border-gray-200 dark:bg-gray-900 dark:border-gray-800
          transition-all duration-300 ease-in-out
          lg:translate-x-0
          ${isCollapsed ? 'w-20 -translate-x-full' : 'w-64 translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="flex flex-col py-4 px-4 border-b dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1 flex justify-center">
              {theme?.logo_url && (
                <div
                  className={`flex-shrink-0 transition-all duration-300 ${isCollapsed ? 'w-10 h-10' : 'w-16 h-16'}`}
                >
                  <Image
                    src={theme.logo_url}
                    alt={theme?.name || 'Logo'}
                    width={(isCollapsed ? 40 : 64) * (theme.logo_scale || 1.0)}
                    height={(isCollapsed ? 40 : 64) * (theme.logo_scale || 1.0)}
                    className="object-contain w-full h-full"
                  />
                </div>
              )}
            </div>
            {/* Botão interno para desktop */}
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-white absolute right-2 top-2 hidden lg:block"
            >
              {isCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
            </button>

            {/* Botão externo para mobile */}
            <button
              onClick={toggleSidebar}
              className={`
                p-2 rounded-md 
                hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-white 
                fixed top-4 left-4 z-50 
                bg-white dark:bg-gray-900 
                shadow-md
                lg:hidden
                ${!isCollapsed && 'hidden'}
              `}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
          {!isCollapsed && !loading && (
            <div className="text-center">
              <span className="text-xl font-semibold text-gray-800 dark:text-white truncate block">
                {theme?.name || 'SysLari'}
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-2">
            {sidebarItems.map((item) => (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center p-2 rounded-md
                    transition-all duration-200
                    relative
                    ${!isCollapsed ? 'space-x-2' : 'justify-center'}
                    ${
                      isActive(item.href) || isSubmenuActive(item)
                        ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400'
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                    }
                  `}
                  onClick={(e) => {
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

                {/* Submenu */}
                {/* Submenu para sidebar expandida */}
                {!isCollapsed && item.children && openSubmenu === item.name && (
                  <ul className="mt-2 ml-6 space-y-2 border-l-2 border-gray-200">
                    {item.children.map((child) => (
                      <li key={child.name}>
                        <Link
                          href={child.href}
                          className={`
                            block p-2 pl-4 rounded-md
                            ${
                              isActive(child.href)
                                ? 'text-indigo-600 dark:text-indigo-400'
                                : 'text-gray-600 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400'
                            }
                          `}
                        >
                          {child.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Tooltip submenu para sidebar colapsada */}
                {isCollapsed && item.children && (
                  <div
                    className={`
                      absolute left-full top-0 ml-2 
                      bg-white dark:bg-gray-800 
                      rounded-md shadow-lg
                      border border-gray-200 dark:border-gray-700
                      opacity-0 invisible group-hover:opacity-100 group-hover:visible
                      transition-all duration-200
                      z-50
                    `}
                  >
                    <ul className="py-2 w-48">
                      {item.children.map((child) => (
                        <li key={child.name}>
                          <Link
                            href={child.href}
                            className={`
                              block px-4 py-2
                              ${
                                isActive(child.href)
                                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/50'
                                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }
                            `}
                          >
                            {child.name}
                          </Link>
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
