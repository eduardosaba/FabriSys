import React from 'react';
import Image from 'next/image';
import { useTheme } from '../lib/theme';
import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import getImageUrl from '@/lib/getImageUrl';
import Text from '../components/ui/Text';

type Props = {
  onMenuClick?: () => void;
};

export default function Header({ onMenuClick }: Props) {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const [orgName, setOrgName] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrg() {
      try {
        if (!profile?.organization_id) return;
        const { data, error } = await supabase
          .from('organizations')
          .select('nome')
          .eq('id', profile.organization_id)
          .maybeSingle();
        if (error) throw error;
        if (data && (data as any).nome) setOrgName((data as any).nome as string);
      } catch (e) {
        // fallback silencioso
      }
    }
    void loadOrg();
  }, [profile?.organization_id]);
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
                  src={
                    (getImageUrl(theme.logo_url) || theme.logo_url) +
                    (theme && (theme as any).updated_at
                      ? `?v=${new Date((theme as any).updated_at).getTime()}`
                      : '')
                  }
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
                {(orgName ? `${orgName} - ` : '') + (theme?.name || 'Confectio v. 1.0.0')}
              </Text>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {profile ? (
            <>
              {/* Avatar do usuário (com fallback para iniciais) */}
              {profile.avatar_url || (profile as any).foto || (profile as any).picture ? (
                <div className="relative w-9 h-9 rounded-full overflow-hidden bg-slate-100">
                  <Image
                    src={
                      getImageUrl(
                        profile.avatar_url || (profile as any).foto || (profile as any).picture
                      ) ||
                      profile.avatar_url ||
                      (profile as any).foto ||
                      (profile as any).picture
                    }
                    alt={(profile as any).name || profile.email || 'Usuário'}
                    width={36}
                    height={36}
                    className="object-cover"
                    unoptimized
                    loading="eager"
                    onError={(e) => {
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        const name = (profile as any).name || profile.email || 'U';
                        const initials = name
                          .split(' ')
                          .map((w: string) => w[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2);
                        parent.innerHTML = `<div class="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white font-medium">${initials}</div>`;
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white font-medium">
                  {(((profile as any).name || profile.email || 'U') as string)
                    .split(' ')
                    .map((w: string) => w[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
              )}

              <div className="hidden sm:flex flex-col text-right">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {(profile as any).name || profile.email}
                </span>
                {profile.role && <span className="text-xs text-slate-400">{profile.role}</span>}
              </div>
            </>
          ) : (
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Usuário</span>
          )}
        </div>
      </div>
    </header>
  );
}
