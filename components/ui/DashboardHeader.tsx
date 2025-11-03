'use client';

import { useState } from 'react';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { Search, Sun, Moon, User, Settings, LogOut } from 'lucide-react';
import Button from '@/components/Button';

type Props = { title?: string; description?: string };

export default function DashboardHeader({ title, description }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
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
  };

  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-6">
      {/* Título/descrição ou busca */}
      <div className="flex-1 max-w-xl">
        {title ? (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
            {description && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
            )}
          </div>
        ) : (
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="search"
              placeholder="Pesquisar..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-800 dark:border-gray-600 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Ações do usuário */}
      <div className="flex items-center gap-4">
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
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <User className="h-5 w-5" />
            <span className="text-sm font-medium">
              {profile?.nome || profile?.email || 'Usuário'}
            </span>
          </button>

          {/* Menu dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5">
              <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                {profile?.role === 'admin' && 'Administrador'}
                {profile?.role === 'fabrica' && 'Fábrica'}
                {profile?.role === 'pdv' && 'PDV'}
              </div>
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
