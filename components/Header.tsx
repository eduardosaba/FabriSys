import React from 'react';
import Image from 'next/image';
import { useTheme } from '../lib/theme';
import getImageUrl from '@/lib/getImageUrl';
import Text from '../components/ui/Text';

type Props = {
  onMenuClick?: () => void;
};

export default function Header({ onMenuClick }: Props) {
  const { theme } = useTheme();
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center border-b bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="flex w-full items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="inline-flex items-center rounded-lg p-2 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600 lg:hidden"
            onClick={onMenuClick}
          >
            <span className="sr-only">Abrir menu</span>
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          <div className="flex items-center gap-3">
            {/* Logo do Sistema (Marca A - sempre visível se existir) */}
            {theme?.logo_url && theme.logo_url.trim() !== '' && (
              <div className="relative">
                <Image
                  src={getImageUrl(theme.logo_url) || theme.logo_url}
                  alt={theme?.name || 'Logo Sistema'}
                  width={32}
                  height={32}
                  className="rounded object-contain"
                  unoptimized
                  loading="eager"
                  style={{
                    width: `calc(32px * var(--logo-scale, 1))`,
                    height: `calc(32px * var(--logo-scale, 1))`,
                    maxWidth: '160px',
                    maxHeight: '160px',
                  }}
                  onError={(e) => {
                    const systemName = theme?.name || 'Confectio v. 1.0.0';
                    const initials = systemName
                      .split(' ')
                      .map((word) => word[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2);

                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      const scale = theme?.logo_scale || 1;
                      const size = 32 * scale;
                      parent.innerHTML = `<div class="rounded bg-primary flex items-center justify-center text-white font-medium text-sm" style="width: ${size}px; height: ${size}px;">${initials}</div>`;
                    }
                  }}
                />
              </div>
            )}

            {/* Fallback quando não há logo do sistema */}
            {!theme?.logo_url || theme.logo_url.trim() === '' ? (
              <div
                className="flex items-center justify-center rounded bg-primary text-sm font-medium text-white"
                style={{
                  width: `${32 * (theme.logo_scale || 1)}px`,
                  height: `${32 * (theme.logo_scale || 1)}px`,
                  minWidth: `${32 * (theme.logo_scale || 1)}px`,
                }}
              >
                {(theme?.name || 'SL')
                  .split(' ')
                  .map((word) => word[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
            ) : null}

            {/* Nome do Sistema (só mostra se não houver logo do sistema) */}
            {(!theme?.logo_url ||
              theme.logo_url.trim() === '' ||
              theme.logo_url === '/logo.png') && (
              <Text variant="h4" weight="medium">
                {theme?.name || 'Confectio v. 1.0.0'}
              </Text>
            )}
          </div>
        </div>

        <div className="flex items-center">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Usuário</span>
        </div>
      </div>
    </header>
  );
}
