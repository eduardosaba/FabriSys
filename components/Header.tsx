import React from 'react';
import Image from 'next/image';
import { useTheme } from '@/lib/theme';
import Text from '@/components/ui/Text';

type Props = {
  onMenuClick?: () => void;
};

export default function Header({ onMenuClick }: Props) {
  const { theme } = useTheme();
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center border-b bg-white dark:bg-gray-800 dark:border-gray-700">
      <div className="flex w-full items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="inline-flex items-center p-2 text-gray-500 rounded-lg lg:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600"
            onClick={onMenuClick}
          >
            <span className="sr-only">Abrir menu</span>
            <svg
              className="w-6 h-6"
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
            <div className="flex items-center gap-3 min-w-[32px] h-[32px]">
              {theme?.logo_url && theme.logo_url.trim() !== '' ? (
                <div className="relative w-8 h-8">
                  <Image
                    src={theme.logo_url}
                    alt={theme?.name || 'Logo'}
                    fill
                    sizes="32px"
                    className="object-contain rounded"
                    unoptimized
                    onError={(e) => {
                      const systemName = theme?.name || 'Sys Lari';
                      const initials = systemName
                        .split(' ')
                        .map((word) => word[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2);

                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        parent.innerHTML = `<div class="w-8 h-8 rounded bg-primary flex items-center justify-center text-white font-medium text-sm">${initials}</div>`;
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-white font-medium text-sm">
                  {(theme?.name || 'SL')
                    .split(' ')
                    .map((word) => word[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
              )}
            </div>
            <Text variant="h4" weight="medium">
              {theme?.name || 'Sys Lari'}
            </Text>
          </div>
        </div>

        <div className="flex items-center">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Usuário</span>
        </div>
      </div>
    </header>
  );
}
